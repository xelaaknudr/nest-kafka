import { DataSource } from 'typeorm';
import { UserEntity } from '../users/models/user.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  database: process.env.POSTGRES_DB ?? 'nestdb',
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  entities: [UserEntity],
  migrations: ['apps/auth/src/migrations/1*.ts'],
  migrationsTableName: 'migrations_auth',
  logging: true,
});
