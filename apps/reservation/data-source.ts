import { DataSource } from 'typeorm';
import { ReservationEntity } from './src/models/reservation.entity.cli';

/**
 * TypeORM CLI DataSource for the `reservation` service.
 *
 * Usage:
 *   pnpm run migration:run:reservation
 *   pnpm run migration:generate:reservation
 *   pnpm run migration:revert:reservation
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
  entities: [ReservationEntity],
  migrations: ['apps/reservation/src/migrations/*.ts'],
  migrationsTableName: 'migrations_reservation',
  logging: true,
});
