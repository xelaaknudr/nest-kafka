export const RMQ_EXCHANGES = {
  DLX: 'dlx-exchange',
  DEFAULT: 'default-exchange',
} as const;

export const RMQ_QUEUES = {
  DLX: 'dlx-queue',
  AUTH: 'auth',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
} as const;

export const RMQ_ROUTING_KEYS = {
  AUTH: {
    AUTHENTICATE: 'authenticate',
  },
  PAYMENTS: {
    CREATE_CHARGE: 'create_charge',
  },
  NOTIFICATIONS: {
    NOTIFY_EMAIL: 'notify_email',
  },
} as const;
