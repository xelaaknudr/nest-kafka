import { Column, Entity, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

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

  @CreateDateColumn()
  createdAt: Date;
}
