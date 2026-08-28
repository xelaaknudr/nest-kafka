/**
 * Auth seed — creates a default test user.
 *
 * Usage:
 *   pnpm run seed:auth
 *
 * Requires POSTGRES_* env vars or defaults to localhost docker-compose settings.
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../users/models/user.entity';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    database: process.env.POSTGRES_DB ?? 'nestdb',
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    schema: 'auth',
    entities: [UserEntity],
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(UserEntity);

  const seeds = [
    { email: 'test@test.com', password: 'Test1234!' },
    { email: 'admin@test.com', password: 'Admin1234!' },
  ];

  for (const seed of seeds) {
    const exists = await repo.findOne({ where: { email: seed.email } });
    if (!exists) {
      const user = repo.create({
        email: seed.email,
        password: await bcrypt.hash(seed.password, 10),
      });
      await repo.save(user);
      console.log(`✅ Seeded user: ${seed.email}`);
    } else {
      console.log(`⏭️  User already exists, skipping: ${seed.email}`);
    }
  }

  await dataSource.destroy();
  console.log('✅ Auth seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
