/**
 * knexfile.ts — конфиг Knex CLI для схемы pg_learn.
 *
 *   pnpm pg:migrate   → knex migrate:latest
 *   pnpm pg:rollback  → knex migrate:rollback
 *   pnpm pg:seed      → knex seed:run (~1-2 мин: генерация 3M+ строк)
 *
 * С хоста: подключается к localhost:5432 (порт проброшен из docker).
 * Внутри контейнера: POSTGRES_HOST=postgres приходит из env.
 *
 * Миграции в проде запускают ОТДЕЛЬНЫМ шагом (k8s Job / init-container),
 * а не на старте приложения: 5 подов одновременно не должны гонять DDL.
 */
import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'nestdb',
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  },
  searchPath: ['pg_learn', 'public'],
  migrations: {
    directory: './src/pg-learn/migrations',
    tableName: 'knex_migrations_pg_learn',
    extension: 'ts',
  },
  seeds: {
    directory: './src/pg-learn/seeds',
    extension: 'ts',
  },
};

export default config;
