import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import {
  LoggerModule,
  CommonRabbitMqModule,
  KafkaModule,
  KAFKA_GROUPS,
} from '@app/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsConsumer } from './notifications.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/notifications/.env',
      validationSchema: Joi.object({
        RABBITMQ_URI: Joi.string().required(),
        GOOGLE_OAUTH_CLIENT_ID: Joi.string().required(),
        GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_OAUTH_REFRESH_TOKEN: Joi.string().required(),
        SMTP_USER: Joi.string().required(),
        KAFKA_BROKERS: Joi.string().default('kafka:9092'),
      }),
    }),
    LoggerModule,
    CommonRabbitMqModule,
    /**
     * 🎓 NOTIFICATIONS = КОНСЬЮМЕР (eachBatch)
     * Паттерн: Пакетная обработка событий о бронированиях.
     * eachBatch позволяет обрабатывать N уведомлений одним bulk-запросом.
     */
    KafkaModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        clientId: 'notifications-service',
        brokers: configService.get<string>('KAFKA_BROKERS')
          ? configService.get<string>('KAFKA_BROKERS').split(',')
          : ['localhost:9092'],
        groupId: KAFKA_GROUPS.NOTIFICATIONS,
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsConsumer],
})
export class NotificationsModule {}
