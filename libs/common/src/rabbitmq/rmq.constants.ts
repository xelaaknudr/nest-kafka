export const RMQ_EXCHANGES = {
  DLX: 'dlx-exchange',
  DEFAULT: 'default-exchange',
} as const;

export const RMQ_QUEUES = {
  DLX: 'dlx-queue',
} as const;

export const RMQ_ROUTING_KEYS = {
  // Empty for now, we will add keys here as we build features
} as const;
