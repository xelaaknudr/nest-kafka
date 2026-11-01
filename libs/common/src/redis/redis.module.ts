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
import Redlock from 'redlock';
import { REDIS_CLIENT, REDLOCK_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';
import { COMPARE_AND_SWAP_COMMAND } from './scripts';

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_CLIENT,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const sentinelHosts = configService.get<string>('REDIS_SENTINEL_HOSTS');
            const sentinelName = configService.get<string>('REDIS_SENTINEL_NAME', 'mymaster');
            const password = configService.get<string>('REDIS_PASSWORD');

            let client: Redis;

            if (sentinelHosts) {
              // 🛡️ РЕЖИМ SENTINEL (Production / High Availability)
              const sentinels = sentinelHosts.split(',').map((item) => {
                const [host, port] = item.trim().split(':');
                return { host, port: parseInt(port, 10) || 26379 };
              });

              client = new Redis({
                sentinels,
                name: sentinelName,
                password,
                // При смене мастера старый отдаёт ошибку READONLY.
                // ioredis перехватывает её и мгновенно переключается на нового мастера:
                reconnectOnError: (err) => err.message.includes('READONLY'),
                retryStrategy: (times: number) => Math.min(times * 100, 3000),
                lazyConnect: false,
              });

              client.on('connect', () => {
                console.log(`[RedisModule] 🛡️ Connected via Sentinel to master '${sentinelName}'`);
              });
            } else {
              // ⚡ РЕЖИМ ОДИНОЧНОГО МАСТЕРА (Локальная разработка / Standalone)
              const host = configService.get<string>('REDIS_HOST', 'localhost');
              const port = configService.get<number>('REDIS_PORT', 6379);

              client = new Redis({
                host,
                port,
                password,
                retryStrategy: (times: number) => Math.min(times * 50, 2000),
                lazyConnect: false,
              });

              client.on('connect', () => {
                console.log(`[RedisModule] ✅ Connected directly to Redis Master at ${host}:${port}`);
              });
            }

            client.on('error', (err: Error) => {
              console.error(`[RedisModule] ❌ Redis error: ${err.message}`);
            });

            // 🚀 Регистрация кастомных Lua-скриптов ОДИН РАЗ при старте приложения:
            client.defineCommand(COMPARE_AND_SWAP_COMMAND.name, {
              numberOfKeys: COMPARE_AND_SWAP_COMMAND.numberOfKeys,
              lua: COMPARE_AND_SWAP_COMMAND.lua,
            });

            return client;
          },
        },
        {
          provide: REDLOCK_CLIENT,
          inject: [REDIS_CLIENT],
          useFactory: (client: Redis) => {
            return new Redlock([client], {
              driftFactor: 0.01,
              retryCount: 3,
              retryDelay: 150,
              retryJitter: 50,
            });
          },
        },
        RedisService,
      ],
      exports: [REDIS_CLIENT, REDLOCK_CLIENT, RedisService],
    };
  }
}
