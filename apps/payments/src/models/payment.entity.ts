import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '@app/common';

@Entity({ schema: 'payments' })
export class PaymentEntity extends AbstractEntity<PaymentEntity> {
  @Index({ unique: true, where: '"idempotencyKey" IS NOT NULL' })
  @Column({ nullable: true })
  idempotencyKey: string;

  @Column()
  orderId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'COMPLETED' })
  status: string;

  @Column()
  email: string;
}
