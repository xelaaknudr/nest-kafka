/**
 * redis.module.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Глобальный модуль Redis для всего монорепо.
 *
 * Использует паттерн DynamicModule.forRootAsync() — такой же, как DatabaseModule
 * и KafkaModule в этом проекте. ConfigService инъектируется асинхронно,
 * что позволяет читать переменные окружения через Joi-валидированный ConfigModule.
 *
 * @Global() — делает провайдеры доступными во всём приложении без повторного импорта.
 * После импорта RedisModule в корневой модуль, RedisService и REDIS_CLIENT
 * можно инъектировать в любом контроллере/сервисе без дополнительных импортов.
 */

import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  /**
   * Асинхронная инициализация Redis-клиента через ConfigService.
   *
   * retryStrategy — функция определяющая задержку между попытками переподключения.
   * Math.min(times * 50, 2000) — экспоненциальный backoff: 50ms, 100ms, ... максимум 2s.
   * Это предотвращает flood при недоступности Redis.
   */
  static forRootAsync(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_CLIENT,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const host = configService.get<string>('REDIS_HOST', 'localhost');
            const port = configService.get<number>('REDIS_PORT', 6379);

            const client = new Redis({
              host,
              port,
              // Стратегия переподключения: увеличиваем задержку с каждой попыткой
              retryStrategy: (times: number) => Math.min(times * 50, 2000),
              // lazyConnect: false — подключаемся сразу при старте приложения
              lazyConnect: false,
            });

            client.on('connect', () => {
              console.log(`[RedisModule] ✅ Connected to Redis at ${host}:${port}`);
            });

            client.on('error', (err: Error) => {
              console.error(`[RedisModule] ❌ Redis error: ${err.message}`);
            });

            return client;
          },
        },
        RedisService,
      ],
      exports: [REDIS_CLIENT, RedisService],
    };
  }
}
