import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SagaStepLog {
  step: string;
  status: 'SUCCESS' | 'FAILED' | 'COMPENSATED';
  timestamp: string;
  details?: any;
}

@Entity({ schema: 'reservations', name: 'saga_instances' })
export class SagaInstanceEntity {
  @PrimaryColumn()
  sagaId: string;

  @Column()
  reservationId: number;

  @Column()
  status:
    | 'STARTED'
    | 'PAYMENT_PENDING'
    | 'NOTIFY_PENDING'
    | 'COMPLETED'
    | 'COMPENSATING'
    | 'COMPENSATED_FAILED';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  history: SagaStepLog[];

  @Column({ nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(entity?: Partial<SagaInstanceEntity>) {
    Object.assign(this, entity);
  }
}
