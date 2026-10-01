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
  SAGA_PAYMENTS_COMMANDS: 'saga-payments-commands-queue',
  SAGA_NOTIFICATIONS_COMMANDS: 'saga-notifications-commands-queue',
  SAGA_ORCHESTRATOR_EVENTS: 'saga-orchestrator-events-queue',
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
  SAGA: {
    // Commands (шлет Оркестратор)
    COMMAND_PAYMENT_PROCESS: 'saga.command.payment.process',
    COMMAND_PAYMENT_REFUND: 'saga.command.payment.refund',
    COMMAND_NOTIFY_SEND: 'saga.command.notify.send',
    // Events (публикуют микросервисы)
    EVENT_PAYMENT_SUCCESS: 'saga.event.payment.success',
    EVENT_PAYMENT_FAILED: 'saga.event.payment.failed',
    EVENT_PAYMENT_REFUNDED: 'saga.event.payment.refunded',
    EVENT_NOTIFY_SUCCESS: 'saga.event.notify.success',
    EVENT_NOTIFY_FAILED: 'saga.event.notify.failed',
  },
  LEARNING: {
    SUBSCRIBE: 'learning.subscribe',
    RPC: 'learning.rpc',
    RPC_HANG: 'learning.rpc.hang',
    RETRY_MAIN: 'learning.retry.main',
    GUARANTEES: {
      AT_MOST_ONCE: 'learning.guarantee.at-most-once',
      AT_LEAST_ONCE: 'learning.guarantee.at-least-once',
      EXACTLY_ONCE: 'learning.guarantee.exactly-once',
      DUPLICATE_RISK: 'learning.guarantee.duplicate-risk',
      IDEMPOTENT_DB: 'learning.guarantee.idempotent-db',
    },
  },
} as const;

