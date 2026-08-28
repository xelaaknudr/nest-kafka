import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Standalone ReservationEntity for TypeORM CLI (migrations, seeds).
 * Uses only relative imports — no @app/common path alias needed.
 * The NestJS app imports ReservationEntity from its models folder with @app/common AbstractEntity.
 */
@Entity({ schema: 'reservations' })
export class ReservationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  timestamp: Date;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  userId: number;

  @Column({ nullable: true })
  invoiceId: string;
}
