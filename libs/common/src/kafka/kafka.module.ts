/**
 * kafka.module.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic NestJS-модуль, который создает один экземпляр Kafka-клиента
 * и предоставляет KafkaProducerService и KafkaConsumerService всему приложению.
 *
 * 🎓 ПОЧЕМУ DYNAMIC MODULE?
 * Каждый микросервис (reservations, payments) может иметь свои настройки:
 *  - свой clientId (имя приложения в логах Kafka)
 *  - свою consumer groupId
 *  - свои брокеры (в разных окружениях: localhost, kafka:9092, prod-broker:9092)
 *
 * forRoot(options) позволяет передать эти настройки при регистрации модуля.
 */

import { DynamicModule, Module } from '@nestjs/common';
import { Kafka, logLevel } from 'kafkajs';
import { KafkaProducerService } from './kafka.producer';
import { KafkaConsumerService } from './kafka.consumer';
import { KafkaAdminService } from './kafka-admin.service';
import { KAFKA_MODULE_OPTIONS } from './kafka.constants';
import {
  KafkaModuleOptions,
  KafkaModuleAsyncOptions,
} from './kafka.interfaces';

@Module({
  providers: [
    {
      provide: Kafka,
      useFactory: (options: KafkaModuleOptions) => {
        return new Kafka({
          clientId: options.clientId,
          brokers: options.brokers,
          retry: {
            initialRetryTime: 1000,
            retries: 10,
          },
          logLevel: logLevel.WARN,
        });
      },
      inject: [KAFKA_MODULE_OPTIONS],
    },
    KafkaProducerService,
    KafkaConsumerService,
    KafkaAdminService,
  ],
  exports: [KafkaProducerService, KafkaConsumerService, KafkaAdminService],
})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  static forRootAsync(options: KafkaModuleAsyncOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
    };
  }
}
