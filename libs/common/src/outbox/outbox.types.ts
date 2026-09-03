import { OutboxEntity } from './outbox.entity';

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

/**
 * Универсальное событие (не зависит от конкретного брокера)
 */
export interface OutboxEvent<TPayload = Record<string, any>> {
  topic: string; // Exchange в RabbitMQ / Topic в Kafka / Queue в SQS
  key: string; // RoutingKey в RabbitMQ / PartitionKey в Kafka
  payload: TPayload;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey?: string;
}

/**
 * 🎓 PORT (Абстракция транспорта)
 * Outbox-сервис вызывает этот интерфейс, не зная, кто под капотом (RabbitMQ, Kafka, SQS).
 */
export interface IOutboxTransport {
  publish(event: OutboxEntity): Promise<void>;
}

export const OUTBOX_TRANSPORT = 'OUTBOX_TRANSPORT';
export const OUTBOX_OPTIONS = 'OUTBOX_OPTIONS';

export interface OutboxModuleOptions {
  schema?: string;
  pollingIntervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
}
