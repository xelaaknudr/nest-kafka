import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsConsumer } from './payments.consumer';
import { PaymentsRepository } from './payments.repository';
import { PaymentEntity } from './models/payment.entity';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import {
  LoggerModule,
  CommonRabbitMqModule,
  DatabaseModule,
  KafkaModule,
  KAFKA_GROUPS,
} from '@app/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payments/.env',
      validationSchema: Joi.object({
        STRIPE_SECRET_KEY: Joi.string().required(),
        NOTIFICATIONS_HOST: Joi.string().required(),
        NOTIFICATIONS_PORT: Joi.number().required(),
        RABBITMQ_URI: Joi.string().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        KAFKA_BROKERS: Joi.string().default('kafka:9092'),
      }),
    }),
    LoggerModule,
    CommonRabbitMqModule,
    DatabaseModule.forRoot({ schema: 'payments' }),
    DatabaseModule.forFeature([PaymentEntity]),
    /**
     * 🎓 PAYMENTS = КОНСЬЮМЕР + ПРОДЮСЕР (для DLT)
     * Паттерн: Partitioned FIFO (key=userId) + Dead Letter Topic.
     * Payments нужен и Producer (для записи в DLT) и Consumer (для чтения payment.created).
     */
    KafkaModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        clientId: 'payments-service',
        brokers: configService.get<string>('KAFKA_BROKERS')
          ? configService.get<string>('KAFKA_BROKERS').split(',')
          : ['localhost:9092'],
        groupId: KAFKA_GROUPS.PAYMENTS,
      }),
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsConsumer, PaymentsRepository],
  exports: [PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
