/**
 * Reservation seed — creates sample reservations for development.
 *
 * Usage:
 *   pnpm run seed:reservation
 *
 * Requires POSTGRES_* env vars or defaults to localhost docker-compose settings.
 * Run AFTER seed:auth since reservations reference userId.
 */
import { DataSource } from 'typeorm';
import { ReservationEntity } from '../models/reservation.entity.cli';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    database: process.env.POSTGRES_DB ?? 'nestdb',
    username: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    schema: 'reservations',
    entities: [ReservationEntity],
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(ReservationEntity);

  // Placeholder userId — replace with a real user id after running seed:auth
  const placeholderUserId = 1;

  const seeds: Partial<ReservationEntity>[] = [
    {
      timestamp: new Date(),
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-01-15'),
      userId: placeholderUserId,
      invoiceId: 'mock_invoice_001',
    },
    {
      timestamp: new Date(),
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-07'),
      userId: placeholderUserId,
      invoiceId: 'mock_invoice_002',
    },
    {
      timestamp: new Date(),
      startDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-20'),
      userId: placeholderUserId,
      invoiceId: null,
    },
  ];

  for (const [i, data] of seeds.entries()) {
    const entity = repo.create(data);
    await repo.save(entity);
    console.log(`✅ Seeded reservation ${i + 1}`);
  }

  await dataSource.destroy();
  console.log('✅ Reservation seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
