import { Injectable, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsCreateChargeDto } from '../dto/payments-create-charge.dto';
import {
  RabbitRPC,
  RabbitSubscribe,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
  RabbitRetryService,
} from '@app/common';
import { Nack } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class PaymentsConsumer {
  private readonly logger = new Logger(PaymentsConsumer.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly retryService: RabbitRetryService,
  ) {}

  /**
   * 🎓 СЛОЙ 4: ИДЕМПОТЕНТНЫЙ КОНСЬЮМЕР (PAYMENTS CONSUMER)
   *
   * ❓ ЗАЧЕМ ЭТОТ МЕТОД:
   * Принимает сообщения из очереди `payments` (отправленные через Outbox или RPC).
   *
   * 🛡️ МЕХАНИЗМ ЗАЩИТЫ EXACTLY-ONCE:
   * 1. Извлекает сквозной `x-idempotency-key` из AMQP-заголовков сообщения.
   * 2. Передает ключ в `PaymentsService`.
   * 3. В таблице `payments.payment_entity` создан UNIQUE INDEX по колонке `idempotencyKey`.
   * 4. Если Outbox Relay из-за сетевого сбоя пришлет дубликат — база выбросит ошибку 23505,
   *    повторное списание денег заблокируется, а консьюмер мирно подтвердит (ACK) обработку.
   */
  @RabbitRPC({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.PAYMENTS.CREATE_CHARGE,
    queue: RMQ_QUEUES.PAYMENTS,
    queueOptions: { deadLetterExchange: RMQ_EXCHANGES.DLX },
  })
  async createCharge(data: any, amqpMsg: any) {
    const idempotencyKey =
      amqpMsg?.properties?.headers?.['x-idempotency-key'] ||
      data.idempotencyKey;

    this.logger.log(
      `[PaymentsConsumer] Обработка платежа для: ${data.email} (Сумма: $${data.amount}, IdempotencyKey: ${idempotencyKey || 'none'})`,
    );
    return this.paymentsService.createCharge(
      data,
      idempotencyKey,
      data.orderId,
    );
  }

  /**
   * Тест: Умный ретрай и сброс в DLQ через универсальный RabbitRetryService
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.RETRY_MAIN,
    queue: 'learning-retry-main-queue',
  })
  async handleRetryLoop(data: any, amqpMsg: any) {
    this.logger.log(`[PAYMENTS] Принята задача на оплату: ${data.orderId}`);
    try {
      // Имитируем сбой внешней платежной системы (например, Stripe 503)
      throw new Error(
        'Stripe API временно недоступен (503 Service Unavailable)',
      );
    } catch (err) {
      // ВСЯ ЛОГИКА РЕТРАЕВ И DLX В ОДНУ СТРОЧКУ ЧЕРЕЗ СЕРВИС:
      await this.retryService.handleRetry({
        message: amqpMsg, // Передаем конверт для чтения x-retry-count
        payload: data, // Передаем тело заказа для повтора
        exchange: RMQ_EXCHANGES.DIRECT_TEST,
        routingKey: RMQ_ROUTING_KEYS.LEARNING.RETRY_MAIN,
        maxRetries: 3, // Лимит 3 попытки
        delayMs: 3000, // Базовый сон 3 секунды
        backoff: 'exponential', // Экспонента: 3с -> 6с -> 12с
        error: err, // Сохраняем ошибку для отчета в DLQ
      });
    }
  }

  // =========================================================================
  // ХРАНИЛИЩЕ КЛЮЧЕЙ ИДЕМПОТЕНТНОСТИ (В продакшене это Redis с TTL)
  // =========================================================================
  private readonly processedIdempotencyKeys = new Set<string>();

  /**
   * 9.1 ОБРАБОТЧИК: At-Most-Once (Максимум один раз)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Что значит флаг durable: false на очереди?"
   *
   * ОТВЕТ:
   * 1. `durable: false` означает, что сама очередь (структура) живет ТОЛЬКО в оперативной памяти (RAM).
   * 2. Если контейнер RabbitMQ перезагрузится, эта очередь полностью исчезнет.
   * 3. В сочетании с `deliveryMode: 1` у сообщения мы получаем абсолютную скорость работы в RAM
   *    без накладных расходов на запись на диск (IOPS).
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.AT_MOST_ONCE,
    queue: 'guarantee-at-most-once-queue',
    queueOptions: {
      durable: false, // Очередь не сохраняется на диск при рестарте RabbitMQ
    },
  })
  async handleAtMostOnce(data: any) {
    this.logger.log(
      `⚡ [9.1 AT-MOST-ONCE] Получена метрика (RAM Only): ${data.metricName} = ${data.value}`,
    );
    // Обработка завершается успешно. Повторов никогда не будет.
  }

  /**
   * 9.2 ОБРАБОТЧИК: At-Least-Once (Минимум один раз)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Как консьюмер понимает, что сообщение пришло повторно?"
   *
   * ОТВЕТ:
   * 1. При повторной доставке RabbitMQ автоматически выставляет флаг `amqpMsg.fields.redelivered = true`.
   * 2. Это сигнал для консьюмера: "Внимание! Это сообщение уже пытались обработать ранее,
   *    возможно произошел сбой сети в момент отправки ACK. Проверь базу данных перед повторным действием!"
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.AT_LEAST_ONCE,
    queue: 'guarantee-at-least-once-queue',
    queueOptions: {
      durable: true, // Очередь сохраняется на диск (Persistent)
    },
  })
  async handleAtLeastOnce(data: any, amqpMsg: any) {
    const isRedelivered = amqpMsg?.fields?.redelivered;

    if (!isRedelivered) {
      this.logger.warn(
        `⚠️ [9.2 AT-LEAST-ONCE] Попытка #1 для заказа ${data.orderId}. Имитируем сбой сети (Nack requeue: true)...`,
      );
      // Возвращаем в очередь один раз, чтобы RabbitMQ прислал его повторно с флагом redelivered
      return new Nack(true);
    }

    // Вторая попытка: сообщение вернулось!
    this.logger.log(
      `✅ [9.2 AT-LEAST-ONCE] Сообщение УСПЕШНО ДОСТАВЛЕНО со 2-й попытки! (Системный флаг redelivered = ${isRedelivered}): ${data.orderId}`,
    );
  }

  /**
   * 9.3 ОБРАБОТЧИК: Exactly-Once (Ровно один раз через Идемпотентность)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Как реализовать паттерн Idempotent Consumer в NestJS / микросервисах?"
   *
   * ОТВЕТ:
   * 1. Извлекаем уникальный ключ транзакции: `headers['x-idempotency-key']` (или ID платежа/заказа).
   * 2. Атомарно проверяем в быстром хранилище (Redis SETNX или Postgres Unique Constraint):
   *    - Если ключ уже существует: логируем дубликат, НЕ выполняем списание денег и делаем ACK (удаляем дубль).
   *    - Если ключа нет: сохраняем ключ в хранилище (с TTL например 24 часа), списываем деньги и делаем ACK.
   * 3. ИТОГ: Даже если брокер пришлет 10 дубликатов, деньги спишутся строго 1 раз!
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.EXACTLY_ONCE,
    queue: 'guarantee-exactly-once-queue',
    queueOptions: {
      durable: true,
    },
  })
  async handleExactlyOnce(data: any, amqpMsg: any) {
    const key =
      amqpMsg?.properties?.headers?.['x-idempotency-key'] ||
      data.idempotencyKey;

    this.logger.log(
      `📨 [9.3 EXACTLY-ONCE] Прилетел дубликат #${data.duplicateAttempt} для ключа: ${key}`,
    );

    // 1. ПРОВЕРЯЕМ, ОБРАБАТЫВАЛСЯ ЛИ УЖЕ ЭТОТ КЛЮЧ
    if (this.processedIdempotencyKeys.has(key)) {
      this.logger.warn(
        `🛑 [IDEMPOTENCY GUARD] ДУБЛИКАТ ЗАБЛОКИРОВАН! Платеж по ключу "${key}" УЖЕ БЫЛ СПИСАН ранее. Пропускаем повтор и шлем ACK.`,
      );
      // ВАЖНО: Мы отправляем ACK (мирный возврат), чтобы удалить дубликат из очереди и не списывать деньги дважды!
      return;
    }

    // 2. ЕСЛИ КЛЮЧ НОВЫЙ — ВЫПОЛНЯЕМ ОПЛАТУ
    this.logger.log(
      `💰 [PAYMENT SUCCESS] Списываем ${data.amount} с карты для ключа "${key}". Заказ оформлен!`,
    );

    // 3. ЗАПОМИНАЕМ КЛЮЧ В ХРАНИЛИЩЕ
    this.processedIdempotencyKeys.add(key);
  }

  /**
   * КЕЙС 1 (ДЕМОНСТРАЦИЯ БАГА): Обработка БЕЗ Идемпотентности (Duplicate Risk)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Что происходит в базе данных при дублировании сообщений в At-Least-Once?"
   *
   * ОТВЕТ:
   * 1. Если консьюмер просто делает INSERT в базу без проверки уникальности, то каждый повтор сообщения
   *    создает НОВУЮ запись в таблице.
   * 2. Это приводит к тяжелым бизнес-багам: двойное списание денег у клиента, двойное бронирование номера в отеле.
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.DUPLICATE_RISK,
    queue: 'guarantee-duplicate-risk-queue',
    queueOptions: { durable: true },
  })
  async handleDuplicateRisk(data: any) {
    this.logger.warn(
      `💥 [КЕЙС 1: DUPLICATE RISK] Прилетел дубликат заказа #${data.duplicateAttempt} для: ${data.orderId}`,
    );
    await this.paymentsService.processPaymentWithoutIdempotency({
      orderId: data.orderId,
      amount: data.amount,
      email: data.email || 'customer@example.com',
    });
  }

  /**
   * КЕЙС 2 (ЗАЩИТА POSTGRES): Обработка С Идемпотентностью через PostgreSQL (Exactly-Once)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Как база данных помогает достичь Exactly-Once при At-Least-Once доставке?"
   *
   * ОТВЕТ:
   * 1. В таблице создается UNIQUE INDEX по колонке `idempotencyKey` (или ID транзакции).
   * 2. Первая попытка успешно делает INSERT и списывает средства.
   * 3. Все последующие дубликаты натыкаются на Postgres Unique Constraint (ошибка 23505).
   * 4. Сервис перехватывает ошибку, логирует предотвращенный дубль и подтверждает сообщение (ACK).
   * 5. В базе данных остается РОВНО 1 строка!
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.IDEMPOTENT_DB,
    queue: 'guarantee-idempotent-db-queue',
    queueOptions: { durable: true },
  })
  async handleIdempotentDb(data: any, amqpMsg: any) {
    const idempotencyKey =
      amqpMsg?.properties?.headers?.['x-idempotency-key'] ||
      data.idempotencyKey;

    this.logger.log(
      `🛡️ [КЕЙС 2: EXACTLY-ONCE DB] Прилетел дубликат #${data.duplicateAttempt} с ключом: ${idempotencyKey}`,
    );

    const result = await this.paymentsService.processPaymentWithIdempotency({
      idempotencyKey,
      orderId: data.orderId,
      amount: data.amount,
      email: data.email || 'customer@example.com',
    });

    if (result.duplicate) {
      this.logger.warn(
        `🛡️ [IDEMPOTENCY VERIFIED] Дубль по ключу "${idempotencyKey}" успешно нейтрализован базой данных. В базе осталась ровно 1 запись!`,
      );
    }
  }

  /**
   * Тест: Fanout Exchange (Вещание)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.FANOUT_TEST,
    routingKey: '',
    queue: RMQ_QUEUES.FANOUT_TEST_PAYMENTS,
  })
  async handleFanoutTest(data: any) {
    this.logger.log(
      `📢 [FANOUT EXCHANGE] Получено сообщение в payments.consumer: ${JSON.stringify(data)}`,
    );
  }

  /**
   * 🎓 ТЕСТ 10: QUORUM QUEUE (КВОРУМНАЯ ОЧЕРЕДЬ НА БАЗЕ RAFT)
   * Очередь защищена репликацией консенсуса Raft.
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: 'payments.quorum.key',
    queue: 'payments.quorum',
    queueOptions: {
      arguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': 5,
      },
    },
  })
  async handleQuorumTest(data: any) {
    this.logger.log(
      `🛡️ [QUORUM QUEUE (RAFT)] Успешно принято сообщение: ${JSON.stringify(data)} (С защитой от сбоя серверов!)`,
    );
  }

  /**
   * 🎓 ТЕСТ 11: SHARD 1 (ШАРД №1 ОБМЕННИКА CONSISTENT HASH)
   */
  @RabbitSubscribe({
    exchange: 'sharded-orders-exchange',
    routingKey: '1', // Вес 1
    queue: 'orders-shard-1',
  })
  async handleShard1(data: any) {
    this.logger.log(
      `⚡ [SHARD 1] Получен заказ для userId=${data.userId} (OrderId: ${data.orderId})`,
    );
  }

  /**
   * 🎓 ТЕСТ 11: SHARD 2 (ШАРД №2 ОБМЕННИКА CONSISTENT HASH)
   */
  @RabbitSubscribe({
    exchange: 'sharded-orders-exchange',
    routingKey: '1', // Вес 1
    queue: 'orders-shard-2',
  })
  async handleShard2(data: any) {
    this.logger.log(
      `⚡ [SHARD 2] Получен заказ для userId=${data.userId} (OrderId: ${data.orderId})`,
    );
  }
}
