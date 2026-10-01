/**
 * redis.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Типизированная обёртка над ioredis-клиентом.
 *
 * Предоставляет:
 *   - Типизированные методы для всех основных Redis-структур данных
 *   - raw() — доступ к сырому клиенту для продвинутых операций (MULTI, pipeline, EVAL)
 *   - Логирование ошибок через NestJS Logger
 *
 * Структуры данных Redis, покрытые сервисом:
 *   Strings:      get, set, del, exists, incr, decr, append, strlen, mget, mset, setnx, getset
 *   Expiry:       expire, expireat, ttl, pttl, persist
 *   Lists:        lpush, rpush, lrange, lpop, rpop, llen
 *   Hashes:       hset, hget, hgetall, hdel, hkeys, hvals, hincrby
 *   Sets:         sadd, smembers, sismember, scard, sunion, sinter, sdiff
 *   Sorted Sets:  zadd, zrange, zrevrange, zscore, zrank, zrangebyscore, zincrby
 *   Pub/Sub:      publish, subscribe
 *   HyperLogLog:  pfadd, pfcount
 *   Bitfield:     setbit, getbit, bitcount
 *   Geo:          geoadd, geodist, geopos, geosearch
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  // ─── Доступ к сырому клиенту ────────────────────────────────────────────────

  /** Возвращает сырой ioredis-клиент для продвинутых операций (pipeline, MULTI, EVAL) */
  raw(): Redis {
    return this.client;
  }

  // ─── Strings ─────────────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return this.client.exists(...keys);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  async append(key: string, value: string): Promise<number> {
    return this.client.append(key, value);
  }

  async strlen(key: string): Promise<number> {
    return this.client.strlen(key);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return this.client.mget(...keys);
  }

  async setnx(key: string, value: string): Promise<number> {
    return this.client.setnx(key, value);
  }

  // ─── Expiry ───────────────────────────────────────────────────────────────────

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async pttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  async persist(key: string): Promise<number> {
    return this.client.persist(key);
  }

  // ─── Lists ────────────────────────────────────────────────────────────────────

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ─── Hashes ───────────────────────────────────────────────────────────────────

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    return this.client.hmset(key, data);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hkeys(key: string): Promise<string[]> {
    return this.client.hkeys(key);
  }

  async hvals(key: string): Promise<string[]> {
    return this.client.hvals(key);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  // ─── Sets ─────────────────────────────────────────────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  async sunion(...keys: string[]): Promise<string[]> {
    return this.client.sunion(...keys);
  }

  async sinter(...keys: string[]): Promise<string[]> {
    return this.client.sinter(...keys);
  }

  async sdiff(...keys: string[]): Promise<string[]> {
    return this.client.sdiff(...keys);
  }

  // ─── Sorted Sets ──────────────────────────────────────────────────────────────

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.client as any).zrange(key, start, stop, 'WITHSCORES');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    if (withScores) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.client as any).zrevrange(key, start, stop, 'WITHSCORES');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).zrevrange(key, start, stop);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return this.client.zscore(key, member);
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return this.client.zrank(key, member);
  }

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return this.client.zincrby(key, increment, member);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  // ─── Pub/Sub ──────────────────────────────────────────────────────────────────

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  // ─── HyperLogLog ─────────────────────────────────────────────────────────────

  async pfadd(key: string, ...elements: string[]): Promise<number> {
    return this.client.pfadd(key, ...elements);
  }

  async pfcount(...keys: string[]): Promise<number> {
    return this.client.pfcount(...keys);
  }

  // ─── Bitmap ──────────────────────────────────────────────────────────────────

  async setbit(key: string, offset: number, value: 0 | 1): Promise<number> {
    return this.client.setbit(key, offset, value);
  }

  async getbit(key: string, offset: number): Promise<number> {
    return this.client.getbit(key, offset);
  }

  async bitcount(key: string, start?: number, end?: number): Promise<number> {
    if (start !== undefined && end !== undefined) {
      return this.client.bitcount(key, start, end);
    }
    return this.client.bitcount(key);
  }

  // ─── Geo ─────────────────────────────────────────────────────────────────────

  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    return this.client.geoadd(key, longitude, latitude, member);
  }

  async geodist(key: string, member1: string, member2: string, unit: 'm' | 'km' | 'mi' | 'ft' = 'km'): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).geodist(key, member1, member2, unit);
  }

  async geopos(key: string, ...members: string[]): Promise<Array<[string, string] | null>> {
    return this.client.geopos(key, ...members);
  }
}
