/**
 * kafka-learn.controller.ts — RESERVATION SERVICE (Чистый Продюсер)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🗺️ КАРТА ОБУЧЕНИЯ
 *
 * Этот контроллер — твоя точка входа для изучения Kafka.
 * Каждый эндпоинт = одна концепция. Читай KAFKA.md секцию → приходи сюда → читай лог.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  #  │ Маршрут                        │ Концепция                        │
 * ├─────┼────────────────────────────────┼──────────────────────────────────┤
 * │  1  │ POST /1-first-message          │ Topic, Broker, Producer          │
 * │  2  │ POST /2-partition-no-key       │ Без ключа — Kafka выбирает сама  │
 * │  3  │ POST /3-partition-with-key     │ С ключом — всегда одна партиция  │
 * │  4  │ POST /4-round-robin            │ 5 сообщений → разные партиции    │
 * │  5  │ POST /5-fifo                   │ 5 сообщений → одна партиция FIFO │
 * │  6  │ POST /6-at-least-once          │ Ручной commit offset             │
 * │  7  │ POST /7-idempotency            │ Защита от дублей (Guard)         │
 * │  8  │ POST /8-dlt                    │ Dead Letter Topic                │
 * │  9  │ POST /9-batch                  │ eachBatch — пакетная обработка   │
 * │ 10  │ GET  /10-seek/:offset          │ Перемотка истории                │
 * │ 11  │ POST /11-transactions          │ Exactly-Once в 2 топика          │
 * │ 12  │ POST /12-consumer-groups       │ Один топик → два сервиса         │
 * └─────┴────────────────────────────────┴──────────────────────────────────┘
 *
 * 🎓 RESERVATION = ТОЛЬКО ПРОДЮСЕР
 * Этот сервис ТОЛЬКО ОТПРАВЛЯЕТ события. Он понятия не имеет, кто их обработает.
 * Это принцип развязки (Decoupling) — продюсер не зависит от консьюмеров.
 * Аналог в RabbitMQ: отправка в Exchange, не зная какие Queue подписаны.
 */

import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import {
  KafkaProducerService,
  KafkaConsumerService,
  KAFKA_TOPICS,
} from '@app/common';
import { v4 as uuidv4 } from 'uuid';

@Controller('kafka/learn')
export class KafkaLearnController {
  private readonly logger = new Logger(KafkaLearnController.name);

  constructor(
    private readonly producer: KafkaProducerService,
    private readonly consumer: KafkaConsumerService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 1: Первое сообщение — Topic, Broker, Producer
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Что такое Topic, Broker, Producer
   *
   * PRODUCER (Продюсер):
   *   Твой код, который отправляет данные в Kafka.
   *   Аналог в RabbitMQ: amqpConnection.publish(exchange, routingKey, payload)
   *   В Kafka: producer.send({ topic, messages: [{ value }] })
   *
   * TOPIC (Топик):
   *   Именованный поток событий одного типа. Всё что касается пользователей →
   *   в 'user.registered'. Всё что касается платежей → в 'payment.created'.
   *   Аналог в RabbitMQ: Exchange + Queue вместе (но работает по-другому!).
   *   Главное отличие: сообщения в топике НЕ удаляются после прочтения.
   *   Они хранятся на диске (по умолчанию 7 дней). Это ЖУРНАЛ, не почтовый ящик.
   *
   * BROKER (Брокер):
   *   Один сервер Kafka. Получает сообщения и хранит на диске.
   *   Аналог в RabbitMQ: одна нода RabbitMQ.
   *   В нашем docker-compose: контейнер 'kafka' на порту 9092.
   *
   * KAFBAT UI (http://localhost:8080):
   *   Визуальный интерфейс для просмотра топиков, сообщений, потребителей.
   *   Аналог: RabbitMQ Management UI на порту 15672.
   *   После вызова этого эндпоинта — открой Kafbat и найди топик 'user.registered'.
   *   Увидишь своё сообщение там. В RabbitMQ так не получится — оно бы уже исчезло!
   *
   * 📋 ЧТО СМОТРЕТЬ:
   *   1. Лог reservation (этот сервис): "📤 [KafkaProducer] Topic: user.registered"
   *   2. Лог auth-сервиса: "👤 [AUTH] Новый пользователь!"
   *   3. Kafbat UI → Topics → user.registered → Messages
   *
   * curl -X POST http://localhost:3000/kafka/learn/1-first-message \
   *   -H "Content-Type: application/json" \
   *   -d '{"message": "Hello Kafka!"}'
   */
  @Post('1-first-message')
  async step1FirstMessage(@Body() body: { message: string }) {
    const correlationId = uuidv4();

    await this.producer.send(KAFKA_TOPICS.USER_REGISTERED, {
      // value — тело сообщения. Любой JSON-объект. Мы сериализуем его в строку.
      // Аналог в RabbitMQ: payload в amqpConnection.publish(...)
      value: {
        event: 'FIRST_MESSAGE',
        message: body.message,
        sentAt: new Date().toISOString(),
        // correlationId — сквозной ID для трейсинга через все сервисы
        // (виден в логах каждого сервиса который обработает это сообщение)
        correlationId,
      },
      headers: {
        'x-event-type': 'FIRST_MESSAGE',
        'x-correlation-id': correlationId,
        // Заголовки — как HTTP headers, только для брокера.
        // Аналог в RabbitMQ: headers в amqpConnection.publish(exchange, key, payload, { headers })
      },
    });

    return {
      step: 1,
      concept: 'Topic, Broker, Producer',
      topic: KAFKA_TOPICS.USER_REGISTERED,
      correlationId,
      nextStep:
        'Открой http://localhost:8080 → Topics → user.registered → Messages',
      consumerLog: 'docker-compose logs auth | grep "FIRST_MESSAGE"',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 2: Без ключа — Kafka выбирает партицию сама
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Partition (Партиция) + Offset
   *
   * PARTITION (Партиция):
   *   Топик разбит на N независимых журналов (файлов на диске).
   *   Топик 'user.registered' с 3 партициями = 3 параллельных журнала.
   *   Каждая партиция читается отдельно и независимо.
   *   Аналог в RabbitMQ: x-consistent-hash sharding (помнишь наш sharded-exchange?)
   *   Но в Kafka это встроено в сам протокол, а не плагин.
   *
   * OFFSET (Смещение):
   *   Порядковый номер сообщения ВНУТРИ одной партиции. Начинается с 0.
   *   Первое сообщение → offset=0, второе → offset=1, третье → offset=2...
   *   Аналог в RabbitMQ: НЕТ АНАЛОГА. Это уникальная концепция Kafka.
   *   Именно offset позволяет перечитать историю (Seek) и отслеживать прогресс (Commit).
   *
   * БЕЗ KEY:
   *   Когда ты не указываешь key → Kafka выбирает партицию самостоятельно
   *   (внутренний sticky partition assignment — в пределах одного batch
   *   сообщения идут в одну партицию, потом переключается).
   *   Гарантия порядка: НЕТ (события могут попасть в разные партиции).
   *   Это нормально для независимых событий (регистрации разных пользователей).
   *
   * 📋 ЧТО СМОТРЕТЬ (лог auth-сервиса):
   *   "[AUTH] Новый пользователь! ... Partition: X | Offset: Y"
   *   При каждом вызове Partition может быть разным!
   *
   * curl -X POST http://localhost:3000/kafka/learn/2-partition-no-key \
   *   -H "Content-Type: application/json" \
   *   -d '{"email": "user@test.com", "name": "Alex"}'
   */
  @Post('2-partition-no-key')
  async step2PartitionNoKey(@Body() body: { email: string; name: string }) {
    await this.producer.send(KAFKA_TOPICS.USER_REGISTERED, {
      // key НЕ указан (undefined) → Kafka выберет партицию сама
      // Сравни с шагом 3, где key указан явно
      value: {
        event: 'USER_REGISTERED_NO_KEY',
        email: body.email,
        name: body.name,
        registeredAt: new Date().toISOString(),
      },
    });

    return {
      step: 2,
      concept: 'Partition без ключа',
      key: null,
      partitionSelection: 'Kafka выбрала сама (sticky assignment)',
      consumerLog: 'docker-compose logs auth | grep Partition',
      tip: 'Вызови этот эндпоинт 3 раза — увидишь разные номера партиций в логах auth',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 3: С ключом — всегда одна и та же партиция
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Key → Deterministic Partitioning
   *
   * КАК РАБОТАЕТ KEY:
   *   Kafka берёт key, вычисляет MurmurHash2(key), делит на N партиций.
   *   Результат: конкретный номер партиции.
   *   MurmurHash2('user-42') % 3 = например, Partition 1
   *   И это ВСЕГДА будет Partition 1 для key='user-42', независимо от времени.
   *
   * АНАЛОГ В RABBITMQ:
   *   Routing key в Direct Exchange → конкретная Queue.
   *   Но! В RabbitMQ разные сообщения с одинаковым routing key идут в одну очередь,
   *   но порядок может нарушиться при нескольких консьюмерах.
   *   В Kafka — партиция = одна очередь с ОДНИМ консьюмером в группе. Строгий порядок!
   *
   * ЗАЧЕМ ЭТО НУЖНО:
   *   Все платежи одного userId = одна партиция = строгий FIFO.
   *   Нельзя обработать "Отмена платежа" (offset=6) до "Создание платежа" (offset=5).
   *   С разными партициями это могло бы произойти!
   *
   * 📋 ЧТО СМОТРЕТЬ (лог payments-сервиса):
   *   "[PAYMENTS] ... Partition: X | Offset: Y | Key: user-42"
   *   Отправь с userId='user-42' несколько раз → Partition всегда одна!
   *
   * curl -X POST http://localhost:3000/kafka/learn/3-partition-with-key \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "user-42", "amount": 1000}'
   */
  @Post('3-partition-with-key')
  async step3PartitionWithKey(
    @Body() body: { userId: string; amount: number },
  ) {
    await this.producer.send(KAFKA_TOPICS.PAYMENT_CREATED, {
      // key = userId → MurmurHash2(userId) % N_partitions = всегда одна партиция
      // Для одного и того же userId результат будет одинаковым ВСЕГДА
      key: body.userId,
      value: {
        event: 'PAYMENT_CREATED',
        userId: body.userId,
        amount: body.amount,
        paymentId: uuidv4(),
      },
    });

    return {
      step: 3,
      concept: 'Детерминированное партиционирование по ключу',
      key: body.userId,
      partitionFormula: `MurmurHash2("${body.userId}") % N = фиксированная партиция`,
      consumerLog: 'docker-compose logs payments | grep Partition',
      tip: `Отправь с userId="${body.userId}" 5 раз — Partition будет одна и та же`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 4: Round-Robin — равномерная нагрузка (5 сообщений)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Round-Robin Distribution
   *
   * КОГДА ИСПОЛЬЗОВАТЬ ROUND-ROBIN (без key):
   *   Когда между сообщениями НЕТ зависимости по порядку.
   *   user1.registered и user2.registered независимы — можно обрабатывать параллельно.
   *   Round-Robin загружает все партиции равномерно = максимальная пропускная способность.
   *
   * АНАЛОГ В RABBITMQ:
   *   Competing Consumers: несколько консьюмеров читают из одной Queue.
   *   RabbitMQ распределяет сообщения по консьюмерам round-robin.
   *   В Kafka: партиции = консьюмеры в группе читают разные партиции параллельно.
   *
   * ЭТОТ ЭНДПОИНТ отправляет 5 сообщений подряд. Смотри на Partition в логах auth.
   * Они будут разными (0, 1, 2, 0, 1...) — это и есть Round-Robin.
   *
   * 📋 ЧТО СМОТРЕТЬ (лог auth-сервиса — 5 записей):
   *   "Partition: 0 | Offset: 3"
   *   "Partition: 1 | Offset: 1"
   *   "Partition: 2 | Offset: 2"
   *   "Partition: 0 | Offset: 4"
   *   "Partition: 1 | Offset: 2"
   *
   * curl -X POST http://localhost:3000/kafka/learn/4-round-robin \
   *   -H "Content-Type: application/json" \
   *   -d '{}'
   */
  @Post('4-round-robin')
  async step4RoundRobin() {
    const users = [
      { email: 'alice@test.com', name: 'Alice' },
      { email: 'bob@test.com', name: 'Bob' },
      { email: 'carol@test.com', name: 'Carol' },
      { email: 'dave@test.com', name: 'Dave' },
      { email: 'eve@test.com', name: 'Eve' },
    ];

    // Отправляем 5 сообщений без key одно за другим
    // Kafka распределит их по партициям самостоятельно
    for (const user of users) {
      await this.producer.send(KAFKA_TOPICS.USER_REGISTERED, {
        // key НЕ указан → Round-Robin по партициям
        value: {
          event: 'USER_REGISTERED_ROUND_ROBIN',
          ...user,
          registeredAt: new Date().toISOString(),
        },
        headers: { 'x-demo': 'round-robin' },
      });
    }

    return {
      step: 4,
      concept: 'Round-Robin — равномерное распределение',
      sentCount: users.length,
      consumerLog: 'docker-compose logs auth | grep Partition',
      expectedResult: 'Увидишь разные номера партиций (0, 1, 2, 0, 1...)',
      tip: 'Сравни с шагом 5 — там один userId → всегда одна партиция',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 5: FIFO — строгий порядок через один ключ
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Partitioned FIFO (First In, First Out)
   *
   * ПРОБЛЕМА БЕЗ FIFO:
   *   Платёж создан (offset=5) и отменён (offset=6) — два события для userId='user-42'.
   *   Если они попадут в разные партиции, консьюмеры могут обработать их в любом порядке.
   *   Результат: деньги списаны ПОСЛЕ отмены. Катастрофа.
   *
   * РЕШЕНИЕ — KEY:
   *   key='user-42' → всегда Partition X → консьюмер читает Partition X строго по offset.
   *   offset=5 обработается РАНЬШЕ offset=6. Гарантированно.
   *
   * КАК РАБОТАЕТ ПОРЯДОК В ПАРТИЦИИ:
   *   Kafka-консьюмер читает сообщения из партиции строго по возрастанию offset.
   *   Он физически не может прочитать offset=6 до offset=5 из одной партиции.
   *   Это гарантируется на уровне хранилища брокера (sequential log read).
   *
   * ЭТОТ ЭНДПОИНТ отправляет 5 платежей с ОДНИМ userId.
   * В логах payments-сервиса все 5 будут в ОДНОЙ партиции, строго по порядку.
   *
   * 📋 ЧТО СМОТРЕТЬ (лог payments-сервиса — 5 записей):
   *   "Partition: 1 | Offset: 0"  ← все в одной партиции!
   *   "Partition: 1 | Offset: 1"
   *   "Partition: 1 | Offset: 2"
   *   "Partition: 1 | Offset: 3"
   *   "Partition: 1 | Offset: 4"
   *
   * curl -X POST http://localhost:3000/kafka/learn/5-fifo \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "user-42"}'
   */
  @Post('5-fifo')
  async step5Fifo(@Body() body: { userId: string }) {
    const amounts = [1000, 2000, 3000, 4000, 5000];

    for (let i = 0; i < amounts.length; i++) {
      await this.producer.send(KAFKA_TOPICS.PAYMENT_CREATED, {
        // ОДИН И ТОТ ЖЕ key для всех 5 сообщений!
        // MurmurHash2(userId) % N = одна и та же партиция для всех
        key: body.userId,
        value: {
          event: 'PAYMENT_FIFO_DEMO',
          userId: body.userId,
          amount: amounts[i],
          sequenceNumber: i + 1, // Для наглядности порядка
          paymentId: uuidv4(),
        },
        headers: { 'x-demo': 'fifo', 'x-sequence': String(i + 1) },
      });
    }

    return {
      step: 5,
      concept: 'FIFO через единый ключ партиционирования',
      key: body.userId,
      sentCount: amounts.length,
      consumerLog: 'docker-compose logs payments | grep "FIFO_DEMO"',
      expectedResult: `Все 5 сообщений в ОДНОЙ партиции, offset растет строго: 0,1,2,3,4`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 6: At-Least-Once — ручной Commit Offset
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Гарантии доставки и ручной Commit Offset
   *
   * COMMIT OFFSET — ЧТО ЭТО:
   *   Аналог ACK в RabbitMQ.
   *   Консьюмер говорит брокеру: "Я обработал сообщение с offset=47, следующее начинай с 48".
   *   Kafka запоминает это в специальном топике '__consumer_offsets'.
   *
   * ТРИ РЕЖИМА ДОСТАВКИ:
   *
   *   At-Most-Once (не более одного раза):
   *   → Commit ПЕРЕД обработкой. Если сервис упал — сообщение потеряно навсегда.
   *   → Аналог в RabbitMQ: autoAck: true
   *   → Когда использовать: аналитика, метрики (потеря пары событий не критична)
   *
   *   At-Least-Once (не менее одного раза, НАШ ВЫБОР):
   *   → Commit ПОСЛЕ успешной обработки. Если упал до commit — прочитает снова.
   *   → Аналог в RabbitMQ: autoAck: false + channel.ack(msg)
   *   → Минус: возможны дубли при сбое. Решение: Idempotency Guard (шаг 7).
   *   → Когда использовать: платежи, заказы, всё важное
   *
   *   Exactly-Once (ровно один раз):
   *   → Kafka Transactions. Рассмотрим в шаге 11.
   *   → Когда использовать: финансовые транзакции где дубли недопустимы
   *
   * В НАШЕМ КОДЕ (kafka.consumer.ts):
   *   autoCommit: false → после handler() вызываем commitOffsets([{ offset: X+1 }])
   *   Если handler() выбросил ошибку → commitOffsets() не вызван → дубль при рестарте
   *
   * 📋 ЧТО СМОТРЕТЬ (лог payments-сервиса):
   *   "📥 [eachMessage] ... Offset: 5"  ← прочитали
   *   (бизнес-логика выполняется)
   *   commitOffsets вызывается внутри KafkaConsumerService автоматически после успеха
   *
   * curl -X POST http://localhost:3000/kafka/learn/6-at-least-once \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "user-99", "amount": 500}'
   */
  @Post('6-at-least-once')
  async step6AtLeastOnce(@Body() body: { userId: string; amount: number }) {
    await this.producer.send(KAFKA_TOPICS.PAYMENT_CREATED, {
      key: body.userId,
      value: {
        event: 'PAYMENT_AT_LEAST_ONCE_DEMO',
        userId: body.userId,
        amount: body.amount,
        paymentId: uuidv4(),
        note: 'Offset будет закоммичен ТОЛЬКО после успешной обработки в payments-service',
      },
    });

    return {
      step: 6,
      concept: 'At-Least-Once + ручной Commit Offset',
      modes: {
        'At-Most-Once':
          'commit ДО обработки → потеря при сбое (эндпоинт /kafka/learn/6-at-most-once)',
        'At-Least-Once (наш выбор)':
          'commit ПОСЛЕ обработки → дубль при сбое (решается Guard)',
        'Exactly-Once': 'Kafka Transactions → шаг 11',
      },
      consumerLog: 'docker-compose logs payments | grep "AT_LEAST_ONCE_DEMO"',
    };
  }

  /**
   * 🎓 КОНЦЕПЦИЯ: Гарантия доставки At-Most-Once (Не более одного раза)
   *
   * СТРАТЕГИЯ: AtMostOnceStrategy
   *   Консьюмер коммитит offset в брокер ДО вызова бизнес-логики.
   *   Если сервис упадет или выбросит ошибку во время обработки —
   *   сообщение потеряно навсегда, но дубля не будет никогда!
   *
   * КОГДА ПРИМЕНЯТЬ:
   *   Аналитика, телеметрия, логины, клики, где важна максимальная скорость.
   *
   * 📋 ЧТО СМОТРЕТЬ (лог auth-сервиса):
   *   "🔑 [AuthService] Пользователь вошел! ... At-Most-Once: Offset X закоммичен ДО выполнения"
   *
   * curl -X POST http://localhost:3000/kafka/learn/6-at-most-once \
   *   -H "Content-Type: application/json" \
   *   -d '{"email": "alex@speed.com"}'
   */
  @Post('6-at-most-once')
  async step6AtMostOnce(@Body() body: { email: string }) {
    await this.producer.send(KAFKA_TOPICS.USER_LOGIN, {
      value: {
        event: 'USER_LOGIN_AT_MOST_ONCE_DEMO',
        email: body.email,
        loginTime: new Date().toISOString(),
      },
    });

    return {
      step: 6,
      concept: 'At-Most-Once доставка (AtMostOnceStrategy)',
      guarantee:
        'Commit ДО обработки: 0 дублей, максимальная скорость, риск потери при сбое',
      topic: KAFKA_TOPICS.USER_LOGIN,
      consumerLog: 'docker-compose logs auth | grep "At-Most-Once"',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 7: Idempotency Guard — защита от дублей на стороне консьюмера
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Idempotency Guard
   *
   * ПРОБЛЕМА:
   *   At-Least-Once гарантирует что сообщение обработается. Но после сбоя — дважды.
   *   Для регистрации пользователя дубль = два одинаковых аккаунта в БД.
   *
   * РЕШЕНИЕ — IDEMPOTENCY GUARD:
   *   Перед обработкой проверяем: "Мы уже видели это сообщение?"
   *   Если да → пропускаем, коммитим offset, идём дальше.
   *   Если нет → обрабатываем, запоминаем.
   *
   * КЛЮЧ ИДЕМПОТЕНТНОСТИ = topic + partition + offset:
   *   Это комбо уникально идентифицирует ровно одно сообщение в Kafka (как PK в БД).
   *   'user.registered:2:47' = топик 'user.registered', партиция 2, сообщение #47.
   *   Почему не payload ID? Продюсер может забыть его добавить. Offset — гарантия брокера.
   *
   * АНАЛОГ В RABBITMQ:
   *   В нашем RabbitMQ-коде: UNIQUE INDEX в PostgreSQL на поле idempotencyKey.
   *   При дубле база выбрасывала ошибку 23505 (unique_violation) — мы её ловили.
   *   В Kafka делаем то же самое
   *
   * ЭТОТ ЭНДПОИНТ: отправляет одно событие с фиксированным ID.
   * Вызови его дважды с одинаковыми данными → в логах auth второй раз увидишь "ДУБЛЬ!"
   *
   * 📋 ЧТО СМОТРЕТЬ (лог auth-сервиса):
   *   Первый вызов:  "👤 [AUTH] Новый пользователь! Email: ..."
   *   Второй вызов: "⚠️ [AUTH] ДУБЛЬ! Пропускаем: user.registered:0:5"
   *
   * curl -X POST http://localhost:3000/kafka/learn/7-idempotency \
   *   -H "Content-Type: application/json" \
   *   -d '{"email": "same@user.com", "name": "SameUser"}'
   */
  @Post('7-idempotency')
  async step7Idempotency(@Body() body: { email: string; name: string }) {
    await this.producer.send(KAFKA_TOPICS.USER_REGISTERED, {
      value: {
        event: 'USER_REGISTERED_IDEMPOTENCY_DEMO',
        email: body.email,
        name: body.name,
        registeredAt: new Date().toISOString(),
      },
      headers: { 'x-demo': 'idempotency' },
    });

    return {
      step: 7,
      concept: 'Idempotency Guard — защита от двойной обработки',
      idempotencyKey: 'topic:partition:offset (уникален гарантированно)',
      storage: 'In-Memory Set (для продакшена → Redis или PostgreSQL)',
      consumerLog:
        'docker-compose logs auth | grep -E "Новый пользователь|ДУБЛЬ"',
      tip: 'Вызови этот эндпоинт ДВАЖДЫ с одинаковым email → второй раз в логах будет ДУБЛЬ!',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 8: Dead Letter Topic — что делать если обработка падает
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Dead Letter Topic (DLT)
   *
   * АНАЛОГ В RABBITMQ:
   *   Dead Letter Exchange (DLX) — ты уже знаешь! Мы делали в payments.consumer.ts.
   *   Сообщение 3 раза падает → летит в x-dead-letter-exchange.
   *   В Kafka: то же самое, только называется Dead Letter Topic (DLT).
   *
   * КАК РАБОТАЕТ DLT В KAFKA:
   *   1. Получили сообщение из 'payment.created'.
   *   2. Handler бросает ошибку (simulateFailure: true).
   *   3. KafkaConsumerService перехватывает ошибку и делает in-process ретраи (1с -> 2с, exponential backoff).
   *   4. После maxRetries=3 неудач → KafkaConsumerService публикует сообщение в 'payment.created.DLT'.
   *   5. Оригинальный offset коммитится → партиция не блокируется, консьюмер идет дальше!
   *
   * DLT PAYLOAD содержит:
   *   - originalPayload: то что не удалось обработать
   *   - failureReason: текст ошибки
   *   - retryCount: сколько попыток было
   *   - headers: x-dlt-source-topic, x-dlt-source-partition, x-dlt-source-offset, x-dlt-reason
   *
   * 📋 ЧТО СМОТРЕТЬ (лог payments-сервиса):
   *   "⚠️ [eachMessage] Ошибка обработки ... (попытка 1/3)"
   *   "⏳ [eachMessage] Ожидание 1000мс перед повтором..."
   *   "⚠️ [eachMessage] Ошибка обработки ... (попытка 2/3)"
   *   "⏳ [eachMessage] Ожидание 2000мс перед повтором..."
   *   "💀 [eachMessage DLT] Превышено 3 попыток ... Отправляем в DLT: payment.created.DLT"
   *
   * curl -X POST http://localhost:3000/kafka/learn/8-dlt \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "bad-user", "amount": 100, "simulateFailure": true}'
   */
  @Post('8-dlt')
  async step8Dlt(
    @Body()
    body: {
      userId?: string;
      orderId?: string;
      amount?: number;
      simulateFailure?: boolean;
    },
  ) {
    const userId = body.userId ?? body.orderId ?? 'bad-user';
    const amount = body.amount ?? 100;

    await this.producer.send(KAFKA_TOPICS.PAYMENT_CREATED, {
      key: userId,
      value: {
        event: 'PAYMENT_DLT_DEMO',
        userId,
        orderId: body.orderId,
        amount,
        // simulateFailure = true → payments.service.ts намеренно бросит ошибку
        simulateFailure: body.simulateFailure ?? true,
        paymentId: uuidv4(),
      },
      headers: { 'x-demo': 'dlt' },
    });

    return {
      step: 8,
      concept: 'Dead Letter Topic (DLT) — как DLX в RabbitMQ, но для Kafka',
      userId,
      amount,
      simulateFailure: body.simulateFailure ?? true,
      flow: [
        '1. payments-service получает сообщение',
        '2. Handler бросает ошибку (simulateFailure=true)',
        '3. KafkaConsumerService выполняет ретраи (1с -> 2с exponential backoff)',
        '4. После 3 попыток → публикует в payment.created.DLT',
        '5. Офсет коммитится → партиция не блокируется и продолжает работу',
      ],
      dltTopic: KAFKA_TOPICS.PAYMENT_DLT,
      consumerLog: 'docker logs -f payments | grep -E "eachMessage|DLT"',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 9: eachBatch — пакетная обработка
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: eachBatch vs eachMessage
   *
   * eachMessage (шаги 1-8):
   *   Вызов handler = 1 сообщение = 1 commit offset.
   *   Подходит для: платежей, регистраций — всего где важна обработка по одному.
   *   Аналог в RabbitMQ: prefetch(1) + ack после каждого сообщения.
   *
   * eachBatch (этот шаг):
   *   Вызов handler = N сообщений = 1 commit offset.
   *   Kafka накапливает сообщения из партиции и передаёт их пачкой.
   *   Обрабатываем пачку, потом один раз делаем commit для всей пачки.
   *
   * ЗАЧЕМ BATCH:
   *   10 000 уведомлений в час:
   *   eachMessage: 10 000 вызовов → 10 000 запросов к SMTP → медленно и дорого
   *   eachBatch (батч 50): 200 вызовов → 200 bulk-запросов к SMTP → в 50 раз быстрее!
   *
   * КЛЮЧЕВЫЕ ПАРАМЕТРЫ BATCH-РЕЖИМА (смотри kafka.consumer.ts):
   *   heartbeat(): вызываем внутри обработки → говорим брокеру "мы живы"
   *               без этого при долгой обработке брокер думает что под умер → Rebalance!
   *   resolveOffset(): помечаем каждое сообщение из пачки как обработанное
   *   isRunning/isStale: проверяем не начался ли Rebalance пока мы обрабатывали пачку
   *   eachBatchAutoResolve: false → мы сами управляем commit (частичный commit батча)
   *
   * 📋 ЧТО СМОТРЕТЬ (лог notifications-сервиса):
   *   "📦 [eachBatch] ... BatchSize: 10"
   *   "📬 [NOTIFICATIONS] Получена пачка: 10 уведомлений"
   *
   * curl -X POST http://localhost:3000/kafka/learn/9-batch \
   *   -H "Content-Type: application/json" \
   *   -d '{"count": 10}'
   */
  @Post('9-batch')
  async step9Batch(@Body() body: { count?: number }) {
    const count = body.count ?? 10;
    const batchId = uuidv4();

    // sendBatch отправляет N сообщений одним TCP-запросом к брокеру
    // (экономия: 1 сетевой roundtrip вместо N)
    const messages = Array.from({ length: count }, (_, i) => ({
      key: `batch-${batchId}-${i}`,
      value: {
        event: 'RESERVATION_CREATED',
        reservationId: uuidv4(),
        guestName: `Гость ${i + 1}`,
        roomNumber: 100 + i,
        batchId,
        indexInBatch: i,
        totalInBatch: count,
      },
      headers: {
        'x-demo': 'batch',
        'x-batch-id': batchId,
        'x-batch-index': String(i),
      },
    }));

    await this.producer.sendBatch(KAFKA_TOPICS.RESERVATION_EVENTS, messages);

    return {
      step: 9,
      concept: 'eachBatch — пакетная обработка в notifications-service',
      sentCount: count,
      batchId,
      optimization: `${count} сообщений отправлены 1 TCP-запросом (вместо ${count})`,
      consumerLog:
        'docker-compose logs notifications | grep -E "BatchSize|пачка"',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 10: Seek — перемотка истории (то чего нет в RabbitMQ)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Seek (Time Travel / Replay)
   *
   * КЛЮЧЕВОЕ ПРЕИМУЩЕСТВО KAFKA НАД RABBITMQ:
   *   В RabbitMQ: сообщение прочитано → ACK → УДАЛЕНО. Назад дороги нет.
   *   В Kafka: сообщения хранятся на диске (7 дней по умолчанию).
   *   Ты можешь в любой момент сказать консьюмеру: "Начни читать с offset=0"
   *   и он переиграет всю историю событий заново.
   *
   * РЕАЛЬНЫЕ СЦЕНАРИИ:
   *   1. Баг в notifications-service: уведомления не отправлялись неделю.
   *      Починил → seekToBeginning → все пропущенные уведомления отправлены.
   *
   *   2. Нужно восстановить состояние БД (Event Sourcing):
   *      Удалил таблицу → seekToBeginning → переиграл все события → БД восстановлена.
   *
   *   3. A/B тест нового алгоритма:
   *      Новый сервис читает ту же историю что и старый → сравниваем результаты.
   *
   * ВАЖНО:
   *   Seek работает только на уже подключённом консьюмере.
   *   Сначала отправь несколько batch-сообщений (шаг 9), потом вызови этот эндпоинт.
   *
   * 📋 ЧТО СМОТРЕТЬ (лог notifications-сервиса):
   *   "⏮️ [Seek] Topic=reservation.events | Partition=0 | Offset=0"
   *   Затем notifications начнёт перечитывать все события с начала.
   *
   * GET http://localhost:3000/kafka/learn/10-seek/0    ← перемотать в самое начало
   * GET http://localhost:3000/kafka/learn/10-seek/5    ← начать с offset=5
   */
  @Get('10-seek/:offset')
  async step10Seek(@Param('offset') offset: string) {
    // Говорим нашему локальному консьюмеру (reservation-service)
    // начать читать reservation.events с указанного offset.
    // В реальной системе — каждый сервис управляет своим консьюмером сам.
    await this.consumer.seekToOffset(
      KAFKA_TOPICS.RESERVATION_EVENTS,
      0, // Партиция 0 (для демо)
      offset,
    );

    return {
      step: 10,
      concept: 'Seek — перемотка истории (невозможно в RabbitMQ!)',
      topic: KAFKA_TOPICS.RESERVATION_EVENTS,
      partition: 0,
      newOffset: offset,
      effect:
        offset === '0'
          ? '🔁 Весь топик будет переигран с самого начала!'
          : `🔁 Будут переиграны все события начиная с offset ${offset}`,
      tip: 'Сначала отправь данные через шаг 9, потом вызови seek/0 — увидишь replay',
      consumerLog:
        'docker-compose logs notifications | grep -E "Seek|eachBatch"',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 11: Kafka Transactions — Exactly-Once в 2 топика
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Kafka Transactions (Exactly-Once Semantics)
   *
   * АНАЛОГ В RABBITMQ:
   *   Transactional Outbox через PostgreSQL-транзакцию — ты помнишь наш outbox.service.ts!
   *   Мы сначала писали в таблицу outbox (в той же транзакции что и бизнес-данные),
   *   а фоновый воркер доставлял сообщения в RabbitMQ.
   *   Это был наш способ добиться атомарности "бизнес-операция + отправка в брокер".
   *
   *   В Kafka этот механизм встроен в сам брокер — не нужна отдельная таблица!
   *
   * КАК РАБОТАЕТ ТРАНЗАКЦИЯ KAFKA:
   *   transaction.begin() → отправляем в topic A → отправляем в topic B → transaction.commit()
   *   Если commit не прошёл → ни topic A, ни topic B не получат сообщений.
   *   Consumer читает только закоммиченные транзакции (isolation.level=read_committed).
   *
   * СЦЕНАРИЙ:
   *   Клиент нажал "Забронировать и оплатить".
   *   Атомарно записываем: PAYMENT_CREATED (в payment.created) + RESERVATION_CONFIRMED (в reservation.events).
   *   Если одно упало → ни payments, ни notifications не получат ничего.
   *
   * 📋 ЧТО СМОТРЕТЬ:
   *   Лог payments: "💳 [PAYMENTS] ... PAYMENT_CREATED"
   *   Лог notifications: "📬 [NOTIFICATIONS] ... RESERVATION_CONFIRMED"
   *   Оба придут одновременно (или не придёт ни одно).
   *
   * curl -X POST з> \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "user-42", "amount": 15000}'
   */
  @Post('11-transactions')
  async step11Transactions(
    @Body()
    body: {
      userId: string;
      amount: number;
      simulateFailure?: boolean;
    },
  ) {
    const reservationId = uuidv4();

    /**
     * 🏛️ КАК ТУТ РАБОТАЮТ 3 КОМПОНЕНТА EXACTLY-ONCE:
     *
     * 1️⃣ TRANSACTION COORDINATOR (Координатор транзакций)
     *    - Метод sendTransactional() связывается с брокером-координатором.
     *    - Координатор открывает транзакцию в системном топике __transaction_state.
     *
     * 2️⃣ PRODUCER ID (PID) + EPOCH (Защита от зомби-инстансов)
     *    - Брокер выдает продюсеру уникальный PID (например, PID=42) и Epoch (версию, например, Epoch=1).
     *    - Если под упадет и поднимется новый с Epoch=2, старый "зависший" под с Epoch=1
     *      больше не сможет протолкнуть ни одного сообщения — брокер его заблокирует (fencing).
     *
     * 3️⃣ SEQUENCE NUMBERS (Дедупликация на уровне брокера)
     *    - Каждое сообщение внутри транзакции получает порядковый номер: Seq=0, Seq=1...
     *    - Если моргнет сеть и продюсер переотправит сообщение, брокер увидит дубль Seq=1
     *      и не запишет его второй раз на диск.
     */
    this.logger.log(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    );
    this.logger.log(
      `🏛️ [Transactions] ── ФАЗА 1: СТАРТ ТРАНЗАКЦИИ (InitProducerId + 2-PC)`,
    );
    this.logger.log(
      `   UserId: ${body.userId} | Amount: ${body.amount} | ReservationId: ${reservationId}`,
    );
    if (body.simulateFailure) {
      this.logger.warn(`   ⚠️ Режим: Имитация аварии (simulateFailure = true)`);
    }

    try {
      await this.producer.sendTransactional(async (transaction) => {
        // ── Атомарная запись #1: в payment.created ─────────────────────────────
        this.logger.log(
          `   1️⃣ [Отправка #1] → топик: "${KAFKA_TOPICS.PAYMENT_CREATED}" (Seq=0, скрыто от консьюмеров)`,
        );
        await transaction.send({
          topic: KAFKA_TOPICS.PAYMENT_CREATED,
          messages: [
            {
              key: body.userId, // FIFO для этого userId
              value: JSON.stringify({
                event: 'PAYMENT_CREATED',
                userId: body.userId,
                amount: body.amount,
                reservationId,
                source: 'kafka-transaction',
              }),
            },
          ],
        });

        // 💥 ЭКСПЕРИМЕНТ: Имитация сбоя между отправками (Abort / Rollback)
        if (body.simulateFailure) {
          this.logger.error(
            `   💥 [АВАРИЯ] Ошибка бизнес-логики ПОСЛЕ первой отправки! Бросаем Error...`,
          );
          throw new Error(
            '💥 Искусственный сбой бизнес-логики: места в отеле закончились! Откатываем транзакцию (ABORT)',
          );
        }

        // ── Атомарная запись #2: в reservation.events ──────────────────────────
        this.logger.log(
          `   2️⃣ [Отправка #2] → топик: "${KAFKA_TOPICS.RESERVATION_EVENTS}" (Seq=1)`,
        );
        await transaction.send({
          topic: KAFKA_TOPICS.RESERVATION_EVENTS,
          messages: [
            {
              key: reservationId,
              value: JSON.stringify({
                event: 'RESERVATION_CONFIRMED',
                reservationId,
                userId: body.userId,
                amount: body.amount,
                source: 'kafka-transaction',
              }),
            },
          ],
        });

        this.logger.log(
          `🏛️ [Transactions] ── ФАЗА 2: ДВУХФАЗНЫЙ КОММИТ (Координатор пишет Commit Marker)`,
        );
      });

      this.logger.log(
        `✅ [Transactions] ВСЁ УСПЕШНО! Оба топика получили сообщения одновременно.`,
      );
      this.logger.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      );

      return {
        step: 11,
        concept: 'Kafka Transactions — Exactly-Once в 2 топика (COMMIT)',
        status: 'COMMITTED ✅',
        reservationId,
        atomicTopics: [
          KAFKA_TOPICS.PAYMENT_CREATED,
          KAFKA_TOPICS.RESERVATION_EVENTS,
        ],
        guarantee: 'Либо ОБА топика получат сообщения, либо НИ ОДИН',
        vsRabbitMQ:
          'В RabbitMQ это решалось через Transactional Outbox (наш outbox.service.ts)',
        consumerLog:
          'docker-compose logs payments && docker-compose logs notifications',
      };
    } catch (error) {
      this.logger.error(
        `❌ [Transactions] ОТКАТ (ABORT)! Координатор записал Abort Marker в оба топика.`,
      );
      this.logger.error(
        `   Ни payments-service, ни notifications-service НЕ прочитают эти сообщения.`,
      );
      this.logger.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      );

      return {
        step: 11,
        concept: 'Kafka Transactions — Откат транзакции (ABORT)',
        status: 'ABORTED ❌',
        error: error.message,
        whatHappened: [
          '1. Сообщение #1 было физически отправлено в payment.created продюсером',
          '2. Сработал simulateFailure → выброшен Error перед записью #2',
          '3. Вызван transaction.abort() → брокер записал Abort Marker',
          '4. Консьюмеры с read_committed отфильтровали и НЕ прочитали сообщение #1!',
        ],
        consumerLog:
          'docker logs payments | grep "kafka-transaction" — там ПУСТО!',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 12: Consumer Groups — один топик, два независимых потребителя
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Consumer Groups (Группы потребителей)
   *
   * АНАЛОГ В RABBITMQ — FANOUT:
   *   В RabbitMQ мы использовали Fanout Exchange: один Exchange → несколько Queue.
   *   Каждая Queue = отдельный подписчик, каждый получает копию сообщения.
   *   Мы делали это для рассылки уведомлений через несколько каналов одновременно.
   *
   * КАК ЭТО РАБОТАЕТ В KAFKA:
   *   Один Topic + несколько Consumer Groups = каждая группа читает ВЕСЬ топик независимо.
   *   payment.created → payments-consumer-group (читает всё)
   *                   → audit-consumer-group (тоже читает всё, независимо!)
   *
   *   Каждая группа хранит СВОЙ offset. Они не мешают друг другу.
   *   payments-group прочитала до offset=100, audit-group до offset=47 — это нормально.
   *
   * ВНУТРИ ОДНОЙ ГРУППЫ (горизонтальное масштабирование):
   *   5 партиций + 1 под с groupId='payments' → под читает все 5 партиций
   *   5 партиций + 5 подов с groupId='payments' → каждый под читает 1 партицию
   *   5 партиций + 10 подов → 5 подов работают, 5 простаивают (партиций не хватит)
   *
   * ЭТОТ ЭНДПОИНТ: отправляет в reservation.events.
   *   notifications-consumer-group читает этот топик.
   *   Если бы подключили audit-service с другим groupId — он бы тоже читал!
   *
   * 📋 ЧТО СМОТРЕТЬ:
   *   Kafbat UI → Topics → reservation.events → Consumer Groups
   *   Видишь все группы и их offset — они независимы!
   *
   * curl -X POST http://localhost:3000/kafka/learn/12-consumer-groups \
   *   -H "Content-Type: application/json" \
   *   -d '{"reservationId": "res-777"}'
   */
  @Post('12-consumer-groups')
  async step12ConsumerGroups(@Body() body: { reservationId?: string }) {
    const reservationId = body.reservationId ?? uuidv4();

    // Отправляем в reservation.events
    // notifications-consumer-group читает этот топик
    // (в реальном проекте сюда могут подключиться analytics-group, audit-group и т.д.)
    await this.producer.send(KAFKA_TOPICS.RESERVATION_EVENTS, {
      key: reservationId,
      value: {
        event: 'RESERVATION_CREATED',
        reservationId,
        note: 'Каждый Consumer Group получит эту копию независимо fan out',
      },
      headers: { 'x-demo': 'consumer-groups' },
    });

    return {
      step: 12,
      concept: 'Consumer Groups — fan-out через независимые группы',
      topic: KAFKA_TOPICS.RESERVATION_EVENTS,
      reservationId,
      consumerGroups: {
        'notifications-consumer-group':
          'читает reservation.events (наш notifications-service)',
        'any-future-group':
          'подключи любой новый сервис → он получит всю историю с offset=0',
      },
      vsRabbitMQ:
        'В RabbitMQ: Fanout Exchange → несколько Queue. В Kafka: один Topic → несколько groupId',
      tip: 'Открой Kafbat UI → Topics → reservation.events → Consumer Groups',
      consumerLog:
        'docker-compose logs notifications | grep "RESERVATION_CREATED"',
    };
  }
}
