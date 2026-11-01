/**
 * knex.module.ts — глобальный провайдер Knex (тонкий query builder поверх `pg`).
 *
 * Почему отдельно от TypeORM: TypeORM остаётся для бизнес-кода сервиса,
 * а Knex используется там, где нужен полный контроль над SQL
 * (CTE, window, LATERAL, SKIP LOCKED, партиции, EXPLAIN).
 *
 * Пул соединений (tarn.js): каждое соединение Postgres = отдельный OS-процесс
 * (~5-10 MB), поэтому пул держим маленьким. 5 подов × max 10 = 50 коннектов.
 */
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { knex, Knex } from 'knex';

export const KNEX = 'KNEX_CONNECTION';
export const InjectKnex = () => Inject(KNEX);

@Global()
@Module({
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Knex =>
        knex({
          client: 'pg',
          connection: {
            host: config.getOrThrow<string>('POSTGRES_HOST'),
            port: Number(config.get('POSTGRES_PORT', 5432)),
            database: config.getOrThrow<string>('POSTGRES_DB'),
            user: config.getOrThrow<string>('POSTGRES_USER'),
            password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
            application_name: 'reservation-pg-learn', // видно в pg_stat_activity
          },
          searchPath: ['pg_learn', 'public'],
          pool: { min: 0, max: 10 },
        }),
    },
  ],
  exports: [KNEX],
})
export class KnexModule implements OnModuleDestroy {
  constructor(@Inject(KNEX) private readonly db: Knex) {}

  // Graceful shutdown: закрываем пул, иначе Postgres держит «висящие» коннекты
  async onModuleDestroy() {
    await this.db.destroy();
  }
}
