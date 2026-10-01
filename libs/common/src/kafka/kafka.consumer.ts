/**
 * kafka.consumer.ts — СЕРВИС КОНСЬЮМЕРА (КАРТА ПО ШАГАМ ОБУЧЕНИЯ)
 * ─────────────────────────────────────────────────────────────────────────────
 * Чтобы не путаться во всем файле сразу, смотри только в тот раздел,
 * который нужен для твоего текущего шага из KAFKA.md:
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ 📌 НАВИГАЦИЯ ПО ШАГАМ ОБУЧЕНИЯ:                                         │
 *  │                                                                         │
 *  │ • РАЗДЕЛ 1: СТАРТ И ПОДКЛЮЧЕНИЕ      → constructor, onApplicationBootstrap│
 *  │ • РАЗДЕЛ 2: [ШАГИ 1-5] БАЗОВАЯ ПОДПИСКА → subscribe(), handleSingleMessage()│
 *  │ • РАЗДЕЛ 3: [ШАГ 6]    РУЧНОЙ КОММИТ → commitOffset()                  │
 *  │ • РАЗДЕЛ 4: [ШАГ 9]    ПАКЕТЫ (BATCH) → subscribeBatch(), handleBatch()  │
 *  │ • РАЗДЕЛ 5: [ШАГ 10]   ПЕРЕМОТКА     → seekToOffset()                   │
 *  │                                                                         │
 *  │ 💡 Где остальные шаги?                                                  │
 *  │ - ШАГ 7 (Идемпотентность): пишется в auth.service.ts (проверка в Redis) │
 *  │ - ШАГ 8 (DLT корзина брака): пишется в payments.service.ts (try/catch)  │
 *  │ - ШАГ 11 (Транзакции): пишется в продюсере (sendTransactional)          │
 *  │ - ШАГ 12 (Группы консьюмеров): настраивается через groupId в модуле    │
 *  └─────────────────────────────────────────────────────────────────────────┘
 */

import {
  Injectable,
  Logger,
  Inject,
  Optional,
  OnModuleDestroy,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  Consumer,
  Kafka,
  KafkaMessage,
  EachMessagePayload,
  EachBatchPayload,
} from 'kafkajs';
import {
  MessageMeta,
  MessageHandler,
  BatchHandler,
  KafkaModuleOptions,
  SubscribeOptions,
  ConsumerRetryOptions,
} from './kafka.interfaces';
import {
  KAFKA_MODULE_OPTIONS,
  DELIVERY_MODES,
  DeliveryMode,
} from './kafka.constants';
import { KafkaProducerService } from './kafka.producer';

interface Subscription {
  handler: MessageHandler<any> | BatchHandler<any>;
  isBatch: boolean;
  deliveryMode?: DeliveryMode;
  retry?: ConsumerRetryOptions;
}

@Injectable()
export class KafkaConsumerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer;
  private readonly groupId: string;

  // Реестр: топик -> подписчик (один обработчик на один топик)
  private readonly subscriptions = new Map<string, Subscription>();

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 1: СТАРТ И ПОДКЛЮЧЕНИЕ К BROKER (Общее для всех шагов)
  // ═══════════════════════════════════════════════════════════════════════════

  constructor(
    private readonly kafka: Kafka,
    @Inject(KAFKA_MODULE_OPTIONS) options: KafkaModuleOptions,
    @Optional() private readonly producer?: KafkaProducerService,
  ) {
    this.groupId = options.groupId;
    this.consumer = this.kafka.consumer({
      /**
       * 1️⃣ groupId — Идентификатор группы консьюмеров (Consumer Group).
       * ─────────────────────────────────────────────────────────────
       * 🎯 ГДЕ ИЗУЧАЕТСЯ: ШАГ 1 (базово) и ШАГ 12 (Fan-Out через группы).
       *
       * • Масштабирование: Все инстансы (поды) одного сервиса с ОДИНАКОВЫМ groupId
       *   делят партиции топика между собой (балансировка нагрузки).
       * • Fan-Out (Шаг 12): Разные сервисы (Auth, Payments) имеют РАЗНЫЕ groupId,
       *   поэтому КАЖДЫЙ сервис независимо получает копию каждого сообщения.
       * • Сохранение прогресса: Именно к groupId привязываются закоммиченные
       *   офсеты в системном топике __consumer_offsets.
       */
      groupId: options.groupId,

      /**
       * 2️⃣ sessionTimeout (30 сек) — Таймаут обнаружения падения сервиса.
       * ─────────────────────────────────────────────────────────────
       * 🎯 ГДЕ ИЗУЧАЕТСЯ: ШАГ 6 (At-Least-Once и падение инстанса).
       *
       * • Сколько времени брокер Kafka готов ждать сигнал жизни (heartbeat) от пода.
       * • Если за 30 секунд от пода не пришло ни одного пинга (под упал с OOM,
       *   завис Node.js event loop или оборвалась сеть) — Kafka объявляет под «мертвым».
       * • После этого брокер запускает REBALANCE — забирает партиции у мертвого пода
       *   и передает их оставшимся живым подам в группе, которые перечитывают
       *   незакоммиченные сообщения заново.
       */
      sessionTimeout: 30000,

      /**
       * 3️⃣ heartbeatInterval (3 сек) — Частота сигналов жизни брокеру.
       * ─────────────────────────────────────────────────────────────
       * 🎯 ГДЕ ИЗУЧАЕТСЯ: ШАГ 9 (Пакетная обработка eachBatch).
       *
       * • Фоновый пинг, который kafkajs автоматически шлет брокеру каждые 3 секунды:
       *   «Я живой, процесс не завис, не выкидывай меня из группы».
       * • Важно для Шага 9: если консьюмер долго обрабатывает пачку из 20 сообщений,
       *   фоновый heartbeat не дает Кафке ошибочно решить, что сервис завис и умер.
       * • ЗОЛОТОЕ ПРАВИЛО: heartbeatInterval ВСЕГДА должен быть минимум в 3 раза меньше,
       *   чем sessionTimeout (обычно 1/3, то есть 3с при 30с).
       */
      heartbeatInterval: 3000,

      /**
       * 4️⃣ rebalanceTimeout (60 сек) — Время на завершение работы при Rebalance.
       * ─────────────────────────────────────────────────────────────
       * 🎯 ГДЕ ИЗУЧАЕТСЯ: ШАГ 9 (eachBatch) и ШАГ 12 (Consumer Groups).
       *
       * • Когда состав группы меняется (поднялся новый под или умер старый),
       *   брокер объявляет Rebalance для перераспределения партиций.
       * • rebalanceTimeout определяет, сколько максимум времени брокер готов подождать,
       *   пока консьюмер закончит обрабатывать СВОЁ ТЕКУЩЕЕ сообщение или длинный батч (Шаг 9)
       *   и закоммитит офсет, ПРЕЖДЕ чем у него принудительно отберут партицию.
       * • Предотвращает ошибки потери или повторной обработки полуготовых батчей.
       */
      rebalanceTimeout: 60000,
    });
  }

  /**
   * 👉 СМОТРИ СЮДА ДЛЯ ШАГОВ 1–6:
   * Регистрирует функцию-обработчик для конкретного топика.
   * Позволяет выбрать стратегию доставки:
   *  - AT_LEAST_ONCE (по умолчанию): commit после успешной обработки
   *  - AT_MOST_ONCE: commit до обработки (для аналитики / метрик)
   */
  subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): void {
    const deliveryMode = options?.deliveryMode ?? DELIVERY_MODES.AT_LEAST_ONCE;
    this.subscriptions.set(topic, {
      handler,
      isBatch: false,
      deliveryMode,
      retry: options?.retry,
    });
  }

  /**
   * Запуск консьюмера, когда всё приложение NestJS уже собрано.
   * Собирает все зарегистрированные топики и запускает прослушивание.
   */
  async onApplicationBootstrap() {
    const topics = [...this.subscriptions.keys()];

    // Если сервис ничего не слушает (например, reservation — чистый продюсер), ничего не делаем
    if (topics.length === 0) {
      return;
    }

    await this.consumer.connect();
    await this.consumer.subscribe({ topics, fromBeginning: false });

    // Проверяем, есть ли хотя бы один батч-обработчик (для Шага 9)
    const hasBatch = [...this.subscriptions.values()].some(
      (sub) => sub.isBatch,
    );

    if (hasBatch) {
      await this.runBatchMode();
    } else {
      await this.runMessageMode();
    }

    this.logger.log(
      `[KafkaConsumer] Group: ${this.groupId} | Topics: ${topics.join(', ')}`,
    );
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log(`[KafkaConsumer] Group: ${this.groupId} disconnected`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 2: [ШАГИ 1–5, 7, 8, 11, 12] БАЗОВОЕ ПОЛУЧЕНИЕ СООБЩЕНИЙ ПО ОДНОМУ
  // ═══════════════════════════════════════════════════════════════════════════

  private async runMessageMode(): Promise<void> {
    await this.consumer.run({
      autoCommit: false, // Ручной коммит дает нам контроль над At-Least-Once (Шаг 6)
      eachMessage: async (payload) => this.handleSingleMessage(payload),
    });
  }

  /**
   * Вызывается KafkaJS на КАЖДОЕ входящее сообщение:
   * 1. Достает готовый offset, partition и headers от брокера Kafka.
   * 2. Парсит JSON из тела сообщения.
   * 3. Передает данные в твой сервис (handler).
   * 4. После успеха — коммитит прогресс в Kafka.
   */
  private async handleSingleMessage(
    payload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = payload;
    const subscription = this.subscriptions.get(topic);

    if (!subscription || subscription.isBatch || !message.value) {
      return;
    }

    const meta = this.buildMessageMeta(topic, partition, message);
    const parsedPayload = this.parseMessagePayload(
      message.value,
      message.offset,
    );
    if (parsedPayload === null) {
      return;
    }

    const handler = subscription.handler as MessageHandler;
    const deliveryMode =
      subscription.deliveryMode ?? DELIVERY_MODES.AT_LEAST_ONCE;

    if (deliveryMode === DELIVERY_MODES.AT_MOST_ONCE) {
      await this.executeAtMostOnce(
        topic,
        partition,
        message.offset,
        handler,
        parsedPayload,
        meta,
      );
    } else {
      await this.executeAtLeastOnce(
        payload,
        subscription,
        handler,
        parsedPayload,
        meta,
      );
    }
  }

  /**
   * ⚡ At-Most-Once: коммит ДО выполнения (0 дублей, максимум скорости).
   */
  private async executeAtMostOnce(
    topic: string,
    partition: number,
    offset: string,
    handler: MessageHandler,
    payload: any,
    meta: MessageMeta,
  ): Promise<void> {
    await this.commitOffset(topic, partition, offset);
    try {
      await handler(payload, meta);
    } catch (err) {
      this.logger.error(
        `[eachMessage] Ошибка обработки offset ${offset} [AT_MOST_ONCE]: ${err.message}`,
      );
    }
  }

  /**
   * 🛡️ At-Least-Once: запуск с ретраями, сбросом в DLT при исчерпании и коммитом ПОСЛЕ успеха.
   */
  private async executeAtLeastOnce(
    eachPayload: EachMessagePayload,
    subscription: Subscription,
    handler: MessageHandler,
    payload: any,
    meta: MessageMeta,
  ): Promise<void> {
    const { topic, partition, message } = eachPayload;
    const retry = subscription.retry;

    const { success, lastError } = await this.runWithRetry(
      handler,
      payload,
      meta,
      message.offset,
      retry,
    );

    if (success) {
      await this.commitOffset(topic, partition, message.offset);
      return;
    }

    // Все попытки исчерпаны: пробуем отправить в DLT
    if (retry?.dltTopic && this.producer) {
      await this.routeToDlt(
        topic,
        partition,
        message,
        payload,
        lastError,
        retry.dltTopic,
        retry.maxRetries ?? 1,
      );
      // Успешно ушло в DLT -> коммитим офсет, чтобы не блокировать партицию
      await this.commitOffset(topic, partition, message.offset);
      return;
    }

    // Если DLT не настроен — пробрасываем ошибку в KafkaJS runner
    throw lastError;
  }

  /**
   * Цикл in-process ретраев с фиксированной или экспоненциальной задержкой.
   */
  private async runWithRetry(
    handler: MessageHandler,
    payload: any,
    meta: MessageMeta,
    offset: string,
    retry?: ConsumerRetryOptions,
  ): Promise<{ success: boolean; lastError?: any }> {
    const maxRetries = retry?.maxRetries ?? 1;
    const initialDelayMs = retry?.initialDelayMs ?? 1000;
    const backoff = retry?.backoff ?? 'fixed';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await handler(payload, meta);
        return { success: true };
      } catch (err) {
        this.logger.warn(
          `⚠️ [eachMessage] Ошибка offset ${offset} (попытка ${attempt}/${maxRetries}): ${err.message}`,
        );

        if (attempt < maxRetries) {
          const delay =
            backoff === 'exponential'
              ? initialDelayMs * Math.pow(2, attempt - 1)
              : initialDelayMs;
          this.logger.log(
            `⏳ [eachMessage] Ожидание ${delay}мс перед попыткой ${attempt + 1}/${maxRetries}...`,
          );
          await this.sleep(delay);
        } else {
          return { success: false, lastError: err };
        }
      }
    }

    return { success: false };
  }

  /**
   * Отправка бракованного сообщения в Dead Letter Topic (DLT).
   */
  private async routeToDlt(
    topic: string,
    partition: number,
    message: KafkaMessage,
    payload: any,
    error: any,
    dltTopic: string,
    retryCount: number,
  ): Promise<void> {
    this.logger.error(
      `💀 [eachMessage DLT] Превышено ${retryCount} попыток для offset ${message.offset}. Отправляем в DLT: ${dltTopic}`,
    );

    await this.producer!.send(dltTopic, {
      key: message.key ? message.key.toString() : undefined,
      value: {
        originalPayload: payload,
        failureReason: error?.message ?? 'Unknown error',
        failedAt: new Date().toISOString(),
        originalTopic: topic,
        originalPartition: partition,
        originalOffset: message.offset,
        retryCount,
      },
      headers: {
        'x-dlt-source-topic': topic,
        'x-dlt-source-partition': String(partition),
        'x-dlt-source-offset': message.offset,
        'x-dlt-reason': error?.message ?? 'Unknown error',
        'x-dlt-retry-count': String(retryCount),
      },
    });
  }

  private parseMessagePayload(value: Buffer, offset: string): any {
    try {
      return JSON.parse(value.toString());
    } catch (err) {
      this.logger.error(
        `[eachMessage] Ошибка парсинга JSON offset ${offset}: ${err.message}`,
      );
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 3: [ШАГ 6] РУЧНОЙ КОММИТ СМЕЩЕНИЙ (At-Least-Once / Аналог ACK)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 👉 СМОТРИ СЮДА ДЛЯ ШАГА 6:
   * Сохраняет прогресс чтения в брокере Kafka (в системном топике __consumer_offsets).
   * Говорит Kafka: "Сообщение с этим offset успешно обработано, в следующий раз начни с offset + 1".
   */
  async commitOffset(
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset: String(BigInt(offset) + 1n), // Kafka ждет следующий ожидаемый offset
      },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 4: [ШАГ 9] ПАКЕТНАЯ ОБРАБОТКА (BATCH PROCESSING)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 👉 СМОТРИ СЮДА ТОЛЬКО ДЛЯ ШАГА 9 (NOTIFICATIONS SERVICE):
   * Регистрация пакетного слушателя. Вместо одного сообщения получает сразу массив.
   */
  subscribeBatch<T>(topic: string, handler: BatchHandler<T>): void {
    this.subscriptions.set(topic, { handler, isBatch: true });
  }

  private async runBatchMode(): Promise<void> {
    await this.consumer.run({
      /**
       * 🎓 eachBatchAutoResolve: true
       * Автоматически помечает смещение последнего сообщения батча как прочитанное (resolved).
       * Без этого KafkaJS в памяти считает, что батч не завершен, и читает его бесконечно по кругу!
       */
      eachBatchAutoResolve: true,
      autoCommit: false,
      eachBatch: async (payload) => this.handleBatch(payload),
    });
  }

  private async handleBatch(payload: EachBatchPayload): Promise<void> {
    const { batch, heartbeat, isRunning, isStale, resolveOffset } = payload;
    const { topic, partition, messages } = batch;

    const subscription = this.subscriptions.get(topic);
    if (!subscription || !subscription.isBatch) {
      return;
    }

    const parsedMessages = this.parseBatchMessages(
      messages,
      topic,
      partition,
      isRunning,
      isStale,
    );

    if (parsedMessages.length === 0) {
      return;
    }

    // 💓 Фоновый heartbeat каждые 3 секунды во время обработки батча:
    // гарантирует, что даже при обработке огромной пачки (20k+ сообщений)
    // брокер Kafka не посчитает под зависшим и не запустит аварийный Rebalance!
    const heartbeatTimer = setInterval(async () => {
      try {
        await heartbeat();
      } catch {
        // Консьюмер останавливается или началась ребалансировка
      }
    }, 3000);

    try {
      // Передаем всю пачку сообщений в сервис оптом (Bulk Processing)
      await (subscription.handler as BatchHandler)(
        parsedMessages,
        topic,
        partition,
      );

      // 🎯 После успешной обработки:
      // 1. Помечаем в KafkaJS in-memory оффсет как обработанный (чтобы не перечитывать снова)
      // 2. Коммитим в брокер Kafka системный оффсет
      const lastOffset = parsedMessages[parsedMessages.length - 1].meta.offset;
      resolveOffset(lastOffset);
      await this.commitOffset(topic, partition, lastOffset);
    } catch (err) {
      this.logger.error(`[eachBatch] Ошибка обработки батча: ${err.message}`);
      throw err;
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  private parseBatchMessages(
    messages: KafkaMessage[],
    topic: string,
    partition: number,
    isRunning: () => boolean,
    isStale: () => boolean,
  ) {
    const parsed = [];

    for (const message of messages) {
      if (!isRunning() || isStale()) break;
      if (!message.value) continue;

      parsed.push({
        payload: JSON.parse(message.value.toString()),
        meta: this.buildMessageMeta(topic, partition, message),
      });
    }

    return parsed;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 5: [ШАГ 10] ПЕРЕМОТКА ВРЕМЕНИ (SEEK TO OFFSET)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 👉 СМОТРИ СЮДА ТОЛЬКО ДЛЯ ШАГА 10:
   * Перематывает указатель чтения назад или вперед.
   * Позволяет переиграть события заново с любого offset (например, с 0).
   */
  async seekToOffset(
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    await this.consumer.seek({ topic, partition, offset });
    this.logger.log(
      `[Seek] Topic=${topic} | Partition=${partition} | Offset=${offset}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // РАЗДЕЛ 6: СЛУЖЕБНЫЕ УТИЛИТЫ (Парсинг заголовков и метаданных)
  // ═══════════════════════════════════════════════════════════════════════════

  private buildMessageMeta(
    topic: string,
    partition: number,
    message: KafkaMessage,
  ): MessageMeta {
    return {
      topic,
      partition,
      offset: message.offset,
      headers: this.parseHeaders(message.headers),
    };
  }

  private parseHeaders(
    rawHeaders: KafkaMessage['headers'],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (!rawHeaders) return result;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (Buffer.isBuffer(value)) {
        result[key] = value.toString();
      } else if (Array.isArray(value)) {
        result[key] = value
          .map((v) => (Buffer.isBuffer(v) ? v.toString() : v))
          .join(',');
      } else {
        result[key] = value ?? '';
      }
    }

    return result;
  }
}
