/**
 * kafka.producer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Сервис-обертка над kafkajs Producer.
 *
 * 🎓 ЗАЧЕМ ОБЕРТКА, А НЕ ПРЯМОЙ KAFKAJS?
 * Мы инкапсулируем:
 *  1. Lifecycle: подключение/отключение (OnModuleInit/OnModuleDestroy)
 *  2. Транзакционный API (Exactly-Once Semantics)
 *  3. Логирование всех отправок
 *  4. Типизацию (payload всегда сериализуется в JSON)
 *
 * Остальной код приложения не знает о kafkajs напрямую — только о KafkaProducerService.
 * Это принцип Dependency Inversion (буква D в SOLID).
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { KAFKA_MODULE_OPTIONS } from './kafka.constants';
import { KafkaModuleOptions } from './kafka.interfaces';
import {
  Kafka,
  Producer,
  Transaction,
  Message,
  CompressionTypes,
  Partitioners,
} from 'kafkajs';

/**
 * Параметры одного сообщения для отправки в Kafka.
 *
 * 🎓 KEY vs VALUE:
 *  - key: Строка для определения партиции (userId, orderId).
 *         Все сообщения с одинаковым key попадают в ОДНУ партицию (FIFO-гарантия).
 *         Если key = null — Kafka распределяет Round-Robin по всем партициям.
 *  - value: Тело сообщения. Мы всегда сериализуем в JSON.
 *  - headers: Метаданные (идемпотентный ключ, тип события, trace-id для трейсинга).
 */
export interface KafkaMessage<T = Record<string, any>> {
  key?: string;
  value: T;
  headers?: Record<string, string>;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;

  constructor(
    private readonly kafka: Kafka,
    @Optional()
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly options?: KafkaModuleOptions,
  ) {
    this.producer = this.kafka.producer({
      /**
       * 🎓 createPartitioner: Partitioners.LegacyPartitioner
       * В KafkaJS v2 по умолчанию включен StickyPartitioner (он прилипает к одной партиции на несколько минут).
       * LegacyPartitioner включает честный Round-Robin по всем партициям для сообщений без ключа (Шаг 2 и Шаг 4).
       */
      createPartitioner: Partitioners.LegacyPartitioner,
      /**
       * 🎓 IDEMPOTENT PRODUCER & TRANSACTIONS:
       * - idempotent: true включает PID + Epoch + Sequence Numbers.
       * - transactionalId: обязателен для транзакций (producer.transaction()).
       */
      idempotent: true,
      maxInFlightRequests: 1,
      transactionalId: this.options?.clientId
        ? `${this.options.clientId}-txn`
        : 'nest-kafka-producer-txn',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('🚀 [KafkaProducer] Подключен к брокеру Kafka');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('🛑 [KafkaProducer] Отключен от брокера Kafka');
  }

  /**
   * 📌 МЕТОД 1: Обычная отправка одного сообщения (At-Least-Once).
   *
   * 🎓 КАК РАБОТАЕТ БАТЧИНГ В KAFKA:
   * В отличие от RabbitMQ, Kafka НЕ отправляет каждое сообщение немедленно.
   * Вместо этого kafkajs накапливает сообщения в памяти (batch buffer)
   * и отправляет их пачками по условию:
   *   - Накопилось 16 КБ (linger.ms), или
   *   - Прошло 5 мс (batch.size).
   * Это даёт в 10-100 раз большую пропускную способность, чем RabbitMQ!
   */
  async send<T>(topic: string, message: KafkaMessage<T>): Promise<void> {
    const kafkaMessage: Message = {
      key: message.key ?? null,
      value: JSON.stringify(message.value),
      headers: {
        'content-type': 'application/json',
        'sent-at': new Date().toISOString(),
        ...message.headers,
      },
    };

    await this.producer.send({
      topic,
      messages: [kafkaMessage],
      /**
       * 🎓 СЖАТИЕ (COMPRESSION):
       * GZIP-сжатие уменьшает размер сообщений в 5-10 раз.
       * Это экономит сеть и дисковое пространство брокера.
       * В RabbitMQ сжатие не встроено — нужно делать руками.
       */
      compression: CompressionTypes.GZIP,
    });

    this.logger.log(
      `📤 [KafkaProducer] Topic: ${topic} | Key: ${message.key ?? 'null'} | Payload: ${JSON.stringify(message.value)}`,
    );
  }

  /**
   * 📌 МЕТОД 2: Пакетная отправка нескольких сообщений сразу (Batching).
   *
   * 🎓 ЗАЧЕМ BATCH?
   * Если нужно отправить 1000 событий, гораздо эффективнее сделать
   * 1 запрос к брокеру на 1000 сообщений, чем 1000 запросов по 1 сообщению.
   * Один batch-запрос снижает network-оверхед и ускоряет запись на диск брокера.
   */
  async sendBatch<T>(
    topic: string,
    messages: KafkaMessage<T>[],
  ): Promise<void> {
    const kafkaMessages: Message[] = messages.map((msg) => ({
      key: msg.key ?? null,
      value: JSON.stringify(msg.value),
      headers: {
        'content-type': 'application/json',
        'sent-at': new Date().toISOString(),
        ...msg.headers,
      },
    }));

    await this.producer.send({
      topic,
      messages: kafkaMessages,
      compression: CompressionTypes.GZIP,
    });

    this.logger.log(
      `📦 [KafkaProducer] Batch Topic: ${topic} | Отправлено: ${messages.length} сообщений`,
    );
  }

  /**
   * 📌 МЕТОД 3: Транзакционная отправка в НЕСКОЛЬКО топиков (Exactly-Once).
   *
   * 🎓 KAFKA TRANSACTIONS (Транзакции Kafka):
   * Позволяют атомарно записать сообщения в НЕСКОЛЬКО топиков одновременно.
   * Либо ВСЕ записи подтверждаются, либо НИ ОДНА.
   *
   * КЛАССИЧЕСКИЙ СЦЕНАРИЙ (Read-Process-Write):
   *  1. Consumer читает из топика A.
   *  2. Обрабатывает данные.
   *  3. Producer атомарно: пишет результат в топик B + коммитит Offset в топике A.
   *  Если что-то упало — откатываются и запись, и коммит Offset!
   *
   * АНАЛОГ В RABBITMQ: Нет прямого аналога! Ближайшее — Transactional Outbox
   * через PostgreSQL-транзакцию. В Kafka это встроено в сам брокер.
   *
   * @param work - Асинхронная функция, получающая объект Transaction.
   *               Внутри нее делаем все продюсерские отправки и commit Offset.
   */
  async sendTransactional(
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<void> {
    // 🏛️ КОМПОНЕНТ 3: TRANSACTION COORDINATOR (Фаза 1: Открытие транзакции)
    // Брокер-координатор открывает запись в системном топике __transaction_state.
    // Продюсер получает контекст с активным PID и Epoch.
    const transaction = await this.producer.transaction();

    try {
      // Сообщения отправляются с порядковыми номерами Sequence Numbers (Компонент 2)
      await work(transaction);

      // 🏛️ Фаза 2: 2-Phase Commit (Успешная фиксация)
      // Координатор пишет commit marker в партиции. Консьюмеры с read_committed теперь видят сообщения!
      await transaction.commit();
      this.logger.log('✅ [KafkaProducer] Транзакция успешно закоммичена');
    } catch (error) {
      // 🏛️ Откат (Abort Marker): Координатор отменяет транзакцию. Ни один консьюмер не прочитает эти сообщения.
      await transaction.abort();
      this.logger.error(
        `❌ [KafkaProducer] Транзакция откачена: ${error.message}`,
      );
      throw error;
    }
  }
}
