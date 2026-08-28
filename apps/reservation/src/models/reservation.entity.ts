import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '@app/common';

@Entity({ schema: 'reservations' })
export class ReservationEntity extends AbstractEntity<ReservationEntity> {
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
