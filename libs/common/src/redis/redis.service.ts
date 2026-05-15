import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService) {
    super({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
    });

    this.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });

    this.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }

  async setWithExpiry(key: string, value: any, expiryInSeconds: number) {
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    return await this.set(key, stringValue, 'EX', expiryInSeconds);
  }

  async getParsed<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
}
