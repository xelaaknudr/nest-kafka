/**
 * kafka.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Центральное место для всех Kafka-констант проекта.
 *
 * 🎓 АРХИТЕКТУРНОЕ РЕШЕНИЕ:
 * Хранить имена топиков, групп и конфигурацию в одном файле,
 * чтобы не было «магических строк» разбросанных по коду.
 * Любое изменение топика делается в одном месте.
 */

/** ─────────────────────────────────────────────────────────────────────────
 * KAFKA TOPICS — имена топиков
 *
 * 🎓 ТОПИК = Canal в Kafka (аналог Exchange + Queue из RabbitMQ).
 * Имена пишутся через точку: <domain>.<action>
 * Это общепринятый стандарт в Enterprise (CloudEvents, Confluent Schema Registry).
 * ───────────────────────────────────────────────────────────────────────── */
export const KAFKA_TOPICS = {
  // ── ПОЛЬЗОВАТЕЛИ (→ auth-service) ─────────────────────────────────────
  /**
   * Событие: Новый пользователь зарегистрировался.
   * Producer: reservation-service (без ключа — Round-Robin по партициям)
   * Consumer: auth-service (демо: Round-Robin + Idempotency Guard)
   */
  USER_REGISTERED: 'user.registered',

  /**
   * Событие: Пользователь выполнил вход в систему.
   * Producer: reservation-service
   * Consumer: auth-service
   */
  USER_LOGIN: 'user.login',

  // ── ПЛАТЕЖИ (→ payments-service) ───────────────────────────────────────
  /**
   * Событие: Инициирован платеж.
   * Producer: reservation-service (key=userId — Partitioned FIFO)
   * Consumer: payments-service (демо: Partitioned + DLT)
   *
   * 🎓 key=userId: все платежи одного клиента строго по порядку (FIFO).
   * Если platform обработает сначала оплату, а потом отмену — баланс верный.
   * Если перепутать порядок — катастрофа в финансах!
   */
  PAYMENT_CREATED: 'payment.created',

  /**
   * Dead Letter Topic для payment.created.
   * Сюда улетают сообщения, которые не удалось обработать после 3 попыток.
   * Аналог DLQ в RabbitMQ, но данные не удаляются — остаются для анализа навсегда.
   */
  PAYMENT_DLT: 'payment.created.DLT',

  // ── БРОНИРОВАНИЯ (→ notifications-service) ────────────────────────────
  /**
   * Событие: Любое событие о резервации (создана, изменена, отменена).
   * Producer: reservation-service (batch-отправка)
   * Consumer: notifications-service (демо: eachBatch + Seek)
   *
   * 🎓 eachBatch: notifications обрабатывает пачку из 10 событий за раз,
   * отправляя 10 писем одной операцией вместо 10 отдельных вызовов.
   */
  RESERVATION_EVENTS: 'reservation.events',
} as const;

/**
 * 🎓 КОЛИЧЕСТВО ПАРТИЦИЙ ПО УМОЛЧАНИЮ ДЛЯ КАЖДОГО ТОПИКА
 * Single source of truth для KafkaAdminService при инициализации.
 */
export const TOPIC_PARTITIONS: Record<string, number> = {
  [KAFKA_TOPICS.USER_REGISTERED]: 3,
  [KAFKA_TOPICS.USER_LOGIN]: 3,
  [KAFKA_TOPICS.PAYMENT_CREATED]: 12,
  [KAFKA_TOPICS.PAYMENT_DLT]: 3,
  [KAFKA_TOPICS.RESERVATION_EVENTS]: 6,
};

/** ─────────────────────────────────────────────────────────────────────────
 * KAFKA GROUPS — имена Consumer Groups
 *
 * 🎓 Consumer Group = «Команда» подов, совместно читающих топик.
 * Каждый сервис имеет свою группу — они читают НЕЗАВИСИМО друг от друга.
 * Каждая группа помнит, до какого offset дочитала (хранится в __consumer_offsets).
 * ───────────────────────────────────────────────────────────────────────── */
export const KAFKA_GROUPS = {
  /**
   * Группа сервиса аутентификации.
   * Демонстрирует: Round-Robin (нет ключа) + Idempotency Guard.
   */
  AUTH: 'auth-consumer-group',

  /**
   * Группа платёжного сервиса.
   * Демонстрирует: Partitioned FIFO (key=userId) + Dead Letter Topic.
   */
  PAYMENTS: 'payments-consumer-group',

  /**
   * Группа сервиса уведомлений.
   * Демонстрирует: eachBatch (пакетная обработка) + Seek (перемотка).
   */
  NOTIFICATIONS: 'notifications-consumer-group',
} as const;

/** Токен для DI-инъекции настроек Kafka-модуля */
export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS';

/** ─────────────────────────────────────────────────────────────────────────
 * DELIVERY MODES — Гарантии доставки сообщений консьюмеру
 *
 * 🎓 СТРАТЕГИИ ОБРАБОТКИ И КОММИТА ОФФСЕТОВ:
 *  - AT_LEAST_ONCE: commit ПОСЛЕ обработки бизнес-логики.
 *    Гарантирует 0 потерь, но при сбое возможен дубль (требует Idempotency Guard).
 *    Применяется для платежей, заказов, аккаунтов.
 *
 *  - AT_MOST_ONCE: commit ДО обработки бизнес-логики.
 *    Гарантирует 0 дублей и максимальную пропускную способность, но при падении
 *    сервиса сообщение будет утеряно.
 *    Применяется для сбора метрик, трекинга кликов, логов, телеметрии.
 * ───────────────────────────────────────────────────────────────────────── */
export const DELIVERY_MODES = {
  AT_LEAST_ONCE: 'AT_LEAST_ONCE',
  AT_MOST_ONCE: 'AT_MOST_ONCE',
} as const;

export type DeliveryMode = (typeof DELIVERY_MODES)[keyof typeof DELIVERY_MODES];
