import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import {
  DatabaseModule,
  HealthModule,
  CommonRabbitMqModule,
  OutboxModule,
  LoggerModule,
  KafkaModule,
  RedisModule,
} from '@app/common';
import { ReservationRepository } from './reservation.repository';
import { ReservationEntity } from './models/reservation.entity';
import { SagaInstanceEntity } from './saga/models/saga-instance.entity';
import * as Joi from 'joi';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaLearnController } from './kafka-test/kafka-learn.controller';
import { SagaOrchestratorService } from './saga/saga-orchestrator.service';
import { SagaEventsConsumer } from './saga/saga-events.consumer';
import { RedisLearnController } from './redis-learn/redis-learn.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/reservation/.env',
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        RABBITMQ_URI: Joi.string().required(),
        KAFKA_BROKERS: Joi.string().default('kafka:9092'),
        // Redis — обязательные переменные для RedisModule
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }),
    }),
    HealthModule,
    DatabaseModule.forRoot({ schema: 'reservations' }),
    DatabaseModule.forFeature([ReservationEntity, SagaInstanceEntity]),
    OutboxModule.forRoot({ schema: 'reservations' }),

    LoggerModule,
    CommonRabbitMqModule,
    /**
     * 🎓 RESERVATION = ТОЛЬКО ПРОДЮСЕР
     * Reservation шлет события в топики — и на этом его роль заканчивается.
     * groupId не важен: у reservation нет ни одного консьюмера!
     * Но KafkaModule требует groupId для инициализации Consumer (он просто не подпишется).
     */
    KafkaModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        clientId: 'reservation-service',
        brokers: configService.get<string>('KAFKA_BROKERS')
          ? configService.get<string>('KAFKA_BROKERS').split(',')
          : ['localhost:9092'],
        groupId: 'reservation-producer-only', // Нет подписок → нет Rebalance
        autoCreateTopics: true, // Инициализирует топики и партиции согласно TOPIC_PARTITIONS
      }),
    }),
    /**
     * 🎓 REDIS MODULE
     * Глобальный модуль — после регистрации здесь REDIS_CLIENT и RedisService
     * доступны во всём приложении без дополнительных imports.
     */
    RedisModule.forRootAsync(),
  ],
  controllers: [ReservationController, KafkaLearnController, RedisLearnController],
  providers: [
    ReservationService,
    ReservationRepository,
    SagaOrchestratorService,
    SagaEventsConsumer,
  ],
  exports: [SagaOrchestratorService],
})
export class ReservationModule {}


