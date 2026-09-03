import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OutboxStatus } from './outbox.types';

@Entity({ name: 'outbox' })
@Index(['status', 'createdAt'])
export class OutboxEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column()
  topic: string; // Exchange / Kafka Topic / SQS Queue

  @Column()
  key: string; // Routing Key / Kafka Partition Key

  @Column()
  aggregateType: string;

  @Column()
  aggregateId: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
  })
  status: OutboxStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  constructor(partial?: Partial<OutboxEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
