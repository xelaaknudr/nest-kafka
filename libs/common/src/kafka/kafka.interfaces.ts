import { DeliveryMode } from './kafka.constants';

export interface MessageMeta {
  topic: string;
  partition: number;
  offset: string;
  headers: Record<string, string>;
}

export type MessageHandler<T = any> = (
  payload: T,
  meta: MessageMeta,
) => Promise<void>;

export type BatchHandler<T = any> = (
  messages: Array<{ payload: T; meta: MessageMeta }>,
  topic: string,
  partition: number,
) => Promise<void>;

export interface ConsumerRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoff?: 'fixed' | 'exponential';
  dltTopic?: string;
}

export interface SubscribeOptions {
  deliveryMode?: DeliveryMode;
  retry?: ConsumerRetryOptions;
}

export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  groupId: string;
  autoCreateTopics?: boolean;
}

export interface KafkaModuleAsyncOptions {
  inject?: any[];
  useFactory: (
    ...args: any[]
  ) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
}
