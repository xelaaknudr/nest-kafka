import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
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
  REDIS_CLIENT,
  KnexModule,
} from '@app/common';
import { ReservationRepository } from './reservation.repository';
import { ReservationEntity } from './models/reservation.entity';
import { SagaInstanceEntity } from './saga/models/saga-instance.entity';
import * as Joi from 'joi';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaLearnController } from './kafka-test/kafka-learn.controller';
import { SagaOrchestratorService } from './saga/saga-orchestrator.service';
import { SagaEventsConsumer } from './saga/saga-events.consumer';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyCleanupTask } from './tasks/daily-cleanup.task';
import { RedisLearnController } from './redis-learn/redis-learn.controller';
import { PgLearnModule } from './pg-learn/pg-learn.module';

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
        // Redis — параметры для Standalone Master или Sentinel
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_SENTINEL_HOSTS: Joi.string().optional(),
        REDIS_SENTINEL_NAME: Joi.string().default('mymaster'),
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
    /**
     * 🚀 PRODUCTION THROTTLER (RATE LIMITING)
     * Глобальный троттлинг на базе Redis для защиты всех микросервисов.
     */
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: any) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: 30 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    /**
     * ⏰ SCHEDULER MODULE
     * Инициализирует шедулер для @Cron задач
     */
    ScheduleModule.forRoot(),
    /**
     * 🐘 KNEX & PG LEARN MODULE
     * Подключает Knex pool и контроллер /pg/learn для Senior PG обучения.
     */
    KnexModule,
    PgLearnModule,
  ],
  controllers: [ReservationController, KafkaLearnController, RedisLearnController],
  providers: [
    ReservationService,
    ReservationRepository,
    SagaOrchestratorService,
    SagaEventsConsumer,
    DailyCleanupTask,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [SagaOrchestratorService, DailyCleanupTask],
})
export class ReservationModule {}


