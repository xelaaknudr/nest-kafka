export const RMQ_EXCHANGES = {
  DLX: 'dlx-exchange',
  DEFAULT: 'default-exchange',
  DIRECT_TEST: 'direct-test-exchange',
  FANOUT_TEST: 'fanout-test-exchange',
  TOPIC_TEST: 'topic-test-exchange',
} as const;

export const RMQ_QUEUES = {
  DLX: 'dlx-queue',
  AUTH: 'auth',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  DIRECT_TEST: 'direct-test-queue',
  FANOUT_TEST_PAYMENTS: 'fanout-payments-queue',
  FANOUT_TEST_NOTIF: 'fanout-notif-queue',
  TOPIC_TEST_EU: 'topic-eu-queue',
  TOPIC_TEST_US: 'topic-us-queue',
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
  DIRECT_TEST: 'direct.test.key',
  TOPIC_TEST_EU: 'eu.#',
  TOPIC_TEST_US: 'us.#',
  LEARNING: {
    SUBSCRIBE: 'learning.subscribe',
    RPC: 'learning.rpc',
    RPC_HANG: 'learning.rpc.hang',
    RETRY_MAIN: 'learning.retry.main',
    GUARANTEES: {
      AT_MOST_ONCE: 'learning.guarantee.at-most-once',
      AT_LEAST_ONCE: 'learning.guarantee.at-least-once',
      EXACTLY_ONCE: 'learning.guarantee.exactly-once',
    },
  },
} as const;
