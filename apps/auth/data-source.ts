import { DataSource } from 'typeorm';
import { UserEntity } from './src/users/models/user.entity';

/**
 * TypeORM CLI DataSource for the `auth` service.
 *
 * Usage:
 *   pnpm run migration:run:auth
 *   pnpm run migration:generate:auth
 *   pnpm run migration:revert:auth
 *
 * In production the connection parameters are read from environment variables.
 * For local development the defaults match docker-compose.yaml.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  database: process.env.POSTGRES_DB ?? 'nestdb',
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  // No `schema` here — migrations table goes to public schema.
  // Schemas (auth, reservations) are created inside the migration files themselves.
  entities: [UserEntity],
  migrations: ['apps/auth/src/migrations/*.ts'],
  migrationsTableName: 'migrations_auth',
  logging: true,
});
