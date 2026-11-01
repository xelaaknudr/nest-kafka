/**
 * redis.constants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Токены для Dependency Injection в NestJS.
 *
 * REDIS_CLIENT — токен для инъекции сырого клиента ioredis.
 * Используется в RedisService и RedisLearnController для прямого доступа
 * к командам Redis без промежуточных абстракций.
 *
 * Пример инъекции в конструкторе:
 *   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 */

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDLOCK_CLIENT = 'REDLOCK_CLIENT';
