# 🚀 Kafka для RabbitMQ-разработчика: Полное руководство

> **Читатель:** Senior/Lead разработчик с глубоким знанием RabbitMQ.
> Каждая концепция объясняется через аналогию с RabbitMQ — сначала аналогия, потом техника.
> Язык: русский. Уровень: production-ready.

---

## Содержание

| #   | Раздел                                                                                     | Эндпоинт                                 |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 1   | [Первое сообщение — Topic, Broker, Producer](#1-первое-сообщение--topic-broker-producer)   | `POST /kafka/learn/1-first-message`      |
| 2   | [Партиции без ключа](#2-партиции--жизнь-без-ключа)                                         | `POST /kafka/learn/2-partition-no-key`   |
| 3   | [Ключ сообщения — всегда одна партиция](#3-ключ-сообщения--всегда-в-одну-партицию)         | `POST /kafka/learn/3-partition-with-key` |
| 4   | [Round-Robin — равномерная нагрузка](#4-round-robin--равномерная-нагрузка)                 | `POST /kafka/learn/4-round-robin`        |
| 5   | [FIFO — строгий порядок через ключ](#5-fifo--строгий-порядок-через-ключ)                   | `POST /kafka/learn/5-fifo`               |
| 6   | [At-Least-Once и ручной Commit Offset](#6-at-least-once-и-ручной-commit-offset)            | `POST /kafka/learn/6-at-least-once`      |
| 7   | [Idempotency Guard — защита от дублей](#7-idempotency-guard--защита-от-дублей-на-consumer) | `POST /kafka/learn/7-idempotency`        |
| 8   | [Dead Letter Topic (DLT)](#8-dead-letter-topic-dlt)                                        | `POST /kafka/learn/8-dlt`                |
| 9   | [eachBatch — пакетная обработка](#9-eachbatch--пакетная-обработка)                         | `POST /kafka/learn/9-batch`              |
| 10  | [Seek — путешествие во времени](#10-seek--путешествие-во-времени)                          | `GET /kafka/learn/10-seek/:offset`       |
| 11  | [Kafka Transactions — Exactly-Once](#11-kafka-transactions--exactly-once)                  | `POST /kafka/learn/11-transactions`      |
| 12  | [Consumer Groups — fan-out через группы](#12-consumer-groups--fan-out-через-группы)        | `POST /kafka/learn/12-consumer-groups`   |

---

## 1. Первое сообщение — Topic, Broker, Producer

### 💡 Аналогия с RabbitMQ

В RabbitMQ ты думаешь так:

- **Exchange** — принимает сообщение и маршрутизирует его
- **Queue** — хранит сообщения до тех пор, пока consumer их не заберёт
- После ACK сообщение **исчезает навсегда**

Kafka думает иначе — она журнал (log), а не очередь:

```
RabbitMQ:
  Producer → Exchange → Queue → Consumer → [сообщение удалено]

Kafka:
  Producer → Topic (Partition) → [сообщение хранится N дней]
                                        ↓
                               Consumer Group A читает
                                        ↓
                               Consumer Group B читает тоже
                                        ↓
                               Consumer Group C читает тоже
```

**Ключевое отличие:** сообщение в Kafka не удаляется после прочтения. Оно хранится `retention.ms` миллисекунд (по умолчанию 7 дней). Любая новая consumer group может прочитать его с самого начала.

---

### 📚 Технические детали

#### Topic (Аналог: Exchange + Queue вместе)

В RabbitMQ Exchange маршрутизирует, Queue хранит — это две разные сущности.
В Kafka **Topic** — это единая сущность, которая и маршрутизирует, и хранит.

```
Topic: "payments"
┌─────────────────────────────────────────────────────────┐
│  Partition 0: [msg0] [msg1] [msg4] [msg7]               │
│  Partition 1: [msg2] [msg5] [msg8]                      │
│  Partition 2: [msg3] [msg6] [msg9]                      │
└─────────────────────────────────────────────────────────┘
```

Topic = логическое имя + набор физических партиций на диске.

#### Broker (Аналог: нода RabbitMQ)

В RabbitMQ кластер из 3 нод — это 3 RabbitMQ брокера с зеркалированием очередей.
В Kafka кластер из 3 нод — это 3 Kafka брокера, каждый хранит часть партиций.

```
Kafka Cluster (3 брокера):
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Broker 1    │   │  Broker 2    │   │  Broker 3    │
│ (Leader P0)  │   │ (Leader P1)  │   │ (Leader P2)  │
│ (Replica P1) │   │ (Replica P2) │   │ (Replica P0) │
└──────────────┘   └──────────────┘   └──────────────┘
```

Каждая партиция имеет одного **Leader** брокера (принимает запись/чтение) и N **Replica** брокеров (синхронно копируют данные). При падении лидера — реплика автоматически становится новым лидером.

#### Producer (Аналог: amqpConnection.publish)

В RabbitMQ:

```typescript
channel.publish(
  'exchange-name',
  'routing.key',
  Buffer.from(JSON.stringify(payload)),
);
```

В Kafka (KafkaJS):

```typescript
await producer.send({
  topic: 'payments',
  messages: [
    {
      key: 'user-123', // опционально, аналог routing key — но работает иначе!
      value: JSON.stringify(payload),
      headers: { 'x-source': 'api' }, // аналог amqp headers
    },
  ],
});
```

#### Kafbat UI (Аналог: RabbitMQ Management)

RabbitMQ Management на `localhost:15672` — ты это знаешь.
Kafbat UI на `http://localhost:8080` — то же самое для Kafka.

Что смотреть в Kafbat UI:

- **Topics** → выбери топик → вкладка **Messages** → видишь все сообщения с offset, partition, key, value
- **Consumer Groups** → видишь lag (отставание) каждой группы от конца топика
- **Brokers** → состояние кластера

---

### ▶ Попробуй сам — Шаг 1

```bash
curl -X POST http://localhost:3000/kafka/learn/1-first-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Kafka!", "userId": "user-001"}'
```

**Смотри лог:** `docker-compose logs auth`

**Ты увидишь:**

```
[AUTH] Received message | Topic: auth-events | Partition: 0 | Offset: 0
[AUTH] Payload: {"message":"Hello Kafka!","userId":"user-001"}
```

**Смотри UI:** Открой http://localhost:8080 → Topics → найди `auth-events` → Messages
Там будет твоё сообщение с Offset: 0.

**Если не видишь:** `docker-compose logs auth | grep -i kafka`

---

## 2. Партиции — Жизнь без ключа

### 💡 Аналогия с RabbitMQ

В RabbitMQ у тебя нет понятия "партиция" — есть одна очередь и в ней сообщения идут строго в порядке поступления (FIFO).

В Kafka один топик физически разбит на несколько **партиций** — это как если бы у тебя была одна логическая очередь, но внутри она состояла из N физических очередей, каждая на своём диске.

```
Topic "auth-events" (3 партиции):

Partition 0 (файл на диске Broker-1):
  Offset: [0][1][2][3][4]...

Partition 1 (файл на диске Broker-2):
  Offset: [0][1][2][3]...

Partition 2 (файл на диске Broker-3):
  Offset: [0][1][2]...
```

**Offset** — это порядковый номер сообщения внутри конкретной партиции. В RabbitMQ аналога нет! Там сообщение либо есть в очереди, либо нет.

---

### 📚 Технические детали

#### Что такое Partition физически?

Партиция — это **append-only файл на диске** (точнее, набор сегментов `.log`).
Kafka никогда не редактирует и не удаляет отдельные сообщения — она только добавляет в конец.

```
/var/kafka/data/auth-events-0/
  ├── 00000000000000000000.log    ← сегмент с offset 0
  ├── 00000000000000000000.index  ← индекс для быстрого seek
  ├── 00000000000001000000.log    ← следующий сегмент с offset 1000000
  └── 00000000000001000000.index
```

Это объясняет, почему Kafka такая быстрая: **последовательная запись на диск** — самая быстрая операция для HDD и SSD.

#### Offset — уникальный адрес сообщения

```
topic="auth-events", partition=0, offset=42  →  конкретное уникальное сообщение
```

Зная topic + partition + offset, ты можешь получить **любое** сообщение, когда угодно (пока не истёк retention).

#### Выбор партиции без ключа

Когда ты отправляешь сообщение **без ключа** (`key: null` или `key: undefined`):

- KafkaJS использует **sticky partitioner** (до полного батча) или **round-robin**
- Kafka сама решает, в какую партицию положить сообщение
- Никаких гарантий порядка между партициями

```
Без ключа: Producer отправляет 6 сообщений
  msg1 → Partition 0
  msg2 → Partition 1
  msg3 → Partition 2
  msg4 → Partition 0
  msg5 → Partition 1
  msg6 → Partition 2

Consumer читает partition 0: msg1, msg4
Consumer читает partition 1: msg2, msg5
Consumer читает partition 2: msg3, msg6
Итого порядок не гарантирован!
```

---

### ▶ Попробуй сам — Шаг 2

```bash
curl -X POST http://localhost:3000/kafka/learn/2-partition-no-key \
  -H "Content-Type: application/json" \
  -d '{"event": "user.login", "timestamp": "2024-01-01T10:00:00Z"}'
```

**Смотри лог:** `docker-compose logs auth`

**Ты увидишь:**

```
[AUTH] Received | Topic: auth-events | Partition: 1 | Offset: 3
[AUTH] Key: null | Event: user.login
```

Обрати внимание на **Partition** — он может быть любым (0, 1 или 2).
Отправь ещё раз и посмотри — партиция может быть другой!

**Если не видишь:** `docker-compose logs auth | grep -i partition`

---

## 3. Ключ сообщения — Всегда в одну партицию

### 💡 Аналогия с RabbitMQ

В RabbitMQ **routing key** — это строка для маршрутизации через Exchange. Exchange сопоставляет её с binding key очереди и решает, куда слать.

В Kafka **message key** — это совсем другое. Он не маршрутизирует к разным консьюмерам. Он **гарантирует, что все сообщения с одинаковым ключом попадут в одну и ту же партицию**. Это механизм упорядочивания, а не маршрутизации.

```
RabbitMQ routing key:
  key="payment.created" → Exchange → Queue A
  key="user.registered" → Exchange → Queue B
  (маршрутизация к РАЗНЫМ очередям)

Kafka message key:
  key="user-123" → всегда Partition 1
  key="user-456" → всегда Partition 0
  key="user-789" → всегда Partition 2
  (гарантия ОДНОЙ партиции = строгий порядок для этого ключа)
```

---

### 📚 Технические детали

#### Алгоритм: MurmurHash2

Kafka использует детерминированный алгоритм для выбора партиции по ключу:

```
partition = MurmurHash2(key) % numPartitions
```

Это означает:

- `"user-123"` → всегда одна и та же партиция (пока не изменилось количество партиций!)
- Функция детерминирована: один и тот же ключ → одна и та же партиция на любом брокере

```
Topic с 3 партициями:

MurmurHash2("user-123") % 3 = 1  → Partition 1
MurmurHash2("user-456") % 3 = 0  → Partition 0
MurmurHash2("user-789") % 3 = 2  → Partition 2
MurmurHash2("user-123") % 3 = 1  → Partition 1 (снова! всегда так)
```

#### Почему это критически важно для порядка?

```
Сценарий: платёж пользователя user-123

msg1: {event: "payment.initiated",  userId: "user-123", amount: 100}  → Partition 1, Offset 0
msg2: {event: "payment.processing", userId: "user-123", amount: 100}  → Partition 1, Offset 1
msg3: {event: "payment.completed",  userId: "user-123", amount: 100}  → Partition 1, Offset 2

Consumer читает Partition 1 строго по offset:
  Offset 0 → payment.initiated    ✅
  Offset 1 → payment.processing   ✅
  Offset 2 → payment.completed    ✅
  Порядок гарантирован!
```

#### ⚠️ Ловушка: изменение количества партиций

Если у топика было 3 партиции и ты добавил 4-ю:

- Старые сообщения остаются там, где были
- **Новые сообщения с тем же ключом могут попасть в другую партицию!**
- `MurmurHash2("user-123") % 4` ≠ `MurmurHash2("user-123") % 3`

**Вывод:** Количество партиций нужно планировать заранее. Не меняй его в продакшене без продуманного плана миграции.

---

### ▶ Попробуй сам — Шаг 3

```bash
curl -X POST http://localhost:3000/kafka/learn/3-partition-with-key \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "event": "payment.created", "amount": 500}'
```

Отправь ещё раз с тем же `userId`:

```bash
curl -X POST http://localhost:3000/kafka/learn/3-partition-with-key \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "event": "payment.completed", "amount": 500}'
```

**Смотри лог:** `docker-compose logs payments`

**Ты увидишь:**

```
[PAYMENTS] Received | Topic: payment-events | | Offse Partition: 1t: 0 | Key: user-123
[PAYMENTS] Received | Topic: payment-events | Partition: 1 | Offset: 1 | Key: user-123
```

Оба сообщения в **одной партиции** (например, Partition 1).
Теперь измени userId на "user-456" и посмотри — партиция будет другой!

**Если не видишь:** `docker-compose logs payments | grep -i partition`

---

## 4. Round-Robin — Равномерная нагрузка

### 💡 Аналогия с RabbitMQ

В RabbitMQ, когда несколько воркеров читают одну очередь, сообщения распределяются между воркерами через **prefetch** (round-robin по умолчанию, если prefetch=1).

В Kafka Round-Robin достигается по-другому: **Producer равномерно раскидывает сообщения без ключа по всем партициям**. Больше партиций = больше consumer instances = больше параллельности.

```
Round-Robin Producer (без ключа, 5 сообщений, 3 партиции):

msg1 → Partition 0 ──→ Consumer Instance A обрабатывает
msg2 → Partition 1 ──→ Consumer Instance B обрабатывает
msg3 → Partition 2 ──→ Consumer Instance C обрабатывает
msg4 → Partition 0 ──→ Consumer Instance A обрабатывает
msg5 → Partition 1 ──→ Consumer Instance B обрабатывает

Всё обрабатывается параллельно!
```

---

### 📚 Технические детали

#### Когда Round-Robin — правильный выбор?

| Сценарий                        | Нужен ключ? | Почему                                       |
| ------------------------------- | ----------- | -------------------------------------------- |
| Регистрация пользователей       | Нет         | Каждая регистрация независима                |
| Отправка email                  | Нет         | Порядок не важен                             |
| Аналитические события           | Нет         | Нет зависимостей между событиями             |
| Платёжные операции одного юзера | **Да**      | Порядок критически важен                     |
| Обновления заказа               | **Да**      | Нельзя обработать "завершён" раньше "создан" |

#### Масштабирование через Round-Robin

```
3 партиции → максимум 3 consumer instances в одной consumer group

┌─────────────────────────────────────────────────────────┐
│ Consumer Group "auth-workers"                           │
│                                                         │
│  Instance 1 ──читает── Partition 0                     │
│  Instance 2 ──читает── Partition 1                     │
│  Instance 3 ──читает── Partition 2                     │
└─────────────────────────────────────────────────────────┘

Если добавить Instance 4 → он будет idle (нет свободных партиций!)
Хочешь больше параллельности → увеличивай количество партиций
```

#### Producer Batching и Round-Robin

KafkaJS батчирует сообщения для производительности. При `linger.ms > 0` несколько сообщений могут попасть в один батч и отправиться в одну партицию (sticky partitioner). Для настоящего round-robin отправляй по одному или задавай `partitioner: roundRobinPartitioner()`.

---

### ▶ Попробуй сам — Шаг 4

Отправь 5 сообщений подряд (без ключа):

```bash
for i in 1 2 3 4 5; do
  curl -X POST http://localhost:3000/kafka/learn/4-round-robin \
    -H "Content-Type: application/json" \
    -d "{\"event\": \"user.action\", \"seq\": $i}"
done
```

**Смотри лог:** `docker-compose logs auth`

**Ты увидишь:**

```
[AUTH] Received | Partition: 0 | Offset: 5 | Seq: 1
[AUTH] Received | Partition: 1 | Offset: 3 | Seq: 2
[AUTH] Received | Partition: 2 | Offset: 4 | Seq: 3
[AUTH] Received | Partition: 0 | Offset: 6 | Seq: 4
[AUTH] Received | Partition: 1 | Offset: 4 | Seq: 5
```

Обрати внимание: сообщения распределены по **разным партициям**.

**Если не видишь:** `docker-compose logs auth | grep -i partition`

---

## 5. FIFO — Строгий порядок через ключ

### 💡 Аналогия с RabbitMQ

В RabbitMQ FIFO гарантируется для всей очереди целиком — это её основное свойство.
В Kafka FIFO гарантируется только **в рамках одной партиции**.

Если тебе нужен строгий порядок для всех событий конкретного пользователя — используй `userId` как ключ. Все его события всегда попадут в одну партицию и будут обработаны строго по порядку.

```
5 платежей пользователя "user-123" с ключом:

Producer:                    Partition 1:
  send(key="user-123", payment.initiated)    → [Offset 0]
  send(key="user-123", payment.auth_check)   → [Offset 1]
  send(key="user-123", payment.processing)   → [Offset 2]
  send(key="user-123", payment.completed)    → [Offset 3]
  send(key="user-123", payment.notified)     → [Offset 4]

Consumer читает Partition 1 строго:
  Offset 0 → payment.initiated    ✅
  Offset 1 → payment.auth_check   ✅
  Offset 2 → payment.processing   ✅
  Offset 3 → payment.completed    ✅
  Offset 4 → payment.notified     ✅
```

---

### 📚 Технические детали

#### Гарантии порядка на разных уровнях

```
Уровень 1: Один producer, одна партиция
  → Порядок гарантирован всегда ✅

Уровень 2: Несколько producer, одна партиция
  → Порядок гарантирован внутри каждого producer ✅
  → Порядок между producers НЕ гарантирован ⚠️

Уровень 3: Одна партиция, один consumer
  → Порядок всегда строгий ✅

Уровень 4: Несколько партицийА
  → Порядок только внутри каждой партиции ✅
  → Порядок между партициями НЕ гарантирован ⚠️
```

#### Надёжность продюсера: Квартет настроек для строгого FIFO и защиты от потерь

Для того чтобы сообщения **не терялись**, **не дублировались** и **не перемешивались при сетевых сбоях**, продюсер настраивается следующей связкой:

```typescript
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,

  // 1. Идемпотентность продюсера (дедупликация на брокере)
  idempotent: true,

  // 2. Только один неподтверждённый запрос в полете на сокет
  maxInFlightRequests: 1,

  // 3. Подтверждение от всех синхронных реплик брокера
  // (В KafkaJS при idempotent: true acks автоматически ставится в -1 / all)
  // acks: -1,
});
```

##### 1. `acks` (Acknowledgements) и ISR (In-Sync Replicas)
Параметр `acks` определяет, сколько брокеров в кластере должны записать сообщение на диск, прежде чем продюсер получит ответ:
* `acks: 0` (Fire-and-Forget): Продюсер отправил байты в сокет и сразу вернул `resolve()`. Если брокер упал через миллисекунду — сообщение потеряно навсегда. Максимальная пропускная способность, нулевая надёжность.
* `acks: 1` (Только Лидер): Продюсер ждёт записи только на брокер-лидер партиции. Если лидер подтвердил запись и тут же сгорел до того, как реплики успели скопировать данные — сообщение потеряно при перевыборах лидера.
* `acks: -1` (или `acks: all`): Брокер-лидер ждёт, пока ВСЕ реплики из списка **ISR (In-Sync Replicas)** запишут сообщение в свой лог, и только потом отправляет подтверждение продюсеру. Это максимальная надёжность: даже при внезапной смерти сервера с лидером данные не пропадут.

##### 2. `idempotent: true` (Защита от сетевых дублей)
* **Проблема:** Продюсер отправил платёж. Брокер записал его в партицию. Но в этот момент моргнула сеть, и ответ `ACK` до продюсера не дошёл. Продюсер думает, что произошла ошибка, и делает retry (повторную отправку).
* **Без идемпотентности:** Брокер запишет платёж второй раз. Клиент заплатит дважды.
* **С идемпотентностью:** Каждому продюсеру брокер выдаёт `Producer ID (PID)`, а каждому сообщению продюсер присваивает порядковый номер `Sequence Number (0, 1, 2...)`. Брокер видит: *«Я уже записал сообщение с PID=10 и Seq=5»* — и отбрасывает дубль, возвращая продюсеру `OK`.

##### 3. `maxInFlightRequests: 1` (Защита от нарушения порядка при retry)
* **Проблема:** Продюсер отправляет Запрос 1 и Запрос 2 одновременно (in-flight = 2).
  - Запрос 1 упал по сетевому таймауту. Продюсер готовит retry через 100 мс.
  - Запрос 2 успешно долетел и записался первым.
  - Через 100 мс долетает повторный Запрос 1 и записывается вторым.
  - Результат: `ORDER_PAID` записался раньше `ORDER_CREATED`!
* **Решение:** `maxInFlightRequests: 1` запрещает отправлять следующий сетевой пакет, пока брокер не подтвердил предыдущий. Порядок гарантирован на 100%.

##### 4. Сравнение: Пропускная способность (Throughput) vs Надёжность

| Сценарий | Настройки продюсера | Пропускная способность | Гарантия порядка | Где применять |
| :--- | :--- | :--- | :--- | :--- |
| **Платежи, Заказы, Аудит (Наш выбор)** | `idempotent: true`<br>`maxInFlight: 1`<br>`acks: -1 (all)` | Умеренная (до десятков тысяч msg/s на ноду) | **Строгий FIFO** ✅ | Финансы, создание аккаунтов, смена статусов |
| **Логи, Клики, Метрики, GPS-трекинг** | `idempotent: false`<br>`maxInFlight: 5-10`<br>`acks: 0 или 1` | Экстремальная (сотни тысяч - миллионы msg/s) | Возможны перестановки ⚠️ | Аналитика, трейсинг, логирование, IoT |

---

#### Главная разница: Сообщения «С ключом» vs «Без ключа»

```
БЕЗ КЛЮЧА (Round-Robin):
  Продюсер ──> [Сообщение A] ──> Партиция 0 ──> Под 1 (AuthService)
           ──> [Сообщение B] ──> Партиция 1 ──> Под 2 (AuthService)
           ──> [Сообщение C] ──> Партиция 2 ──> Под 3 (AuthService)
  Цель: Максимальная параллельность и распределение нагрузки по всем ядрам и серверам.
  Минус: Сообщение B может быть обработано раньше, чем Сообщение A.

С КЛЮЧОМ (key = userId / orderId):
  Продюсер ──> [Событие 1 (user-123)] ──┐
           ──> [Событие 2 (user-123)] ──┼──> Партиция 1 ──> Под 2 (PaymentsService)
           ──> [Событие 3 (user-123)] ──┘
  Цель: Строгий FIFO для одной конкретной сущности (аккаунт, заказ, клиент).
  Плюс: Все события user-123 всегда обрабатываются строго по очереди.
  Масштабирование: События user-456 полетят в Партицию 2 и будут обрабатываться параллельно на другом поде!
```

#### Когда FIFO через ключ — обязателен?

- **Платёжные системы:** `initiated → processing → completed` — строгий порядок
- **Системы заказов:** `created → confirmed → shipped → delivered`
- **Event Sourcing:** воссоздание состояния сущности из событий
- **Оркестрация workflow:** шаги процесса, зависящие друг от друга

---

### ▶ Попробуй сам — Шаг 5

Отправь 5 платежей с одним и тем же `userId`:

```bash
for step in "initiated" "auth_check" "processing" "completed" "notified"; do
  curl -X POST http://localhost:3000/kafka/learn/5-fifo \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"user-123\", \"step\": \"$step\"}"
done
```

**Смотри лог:** `docker-compose logs payments`

**Ты увидишь:**

```
[PAYMENTS] Received | Partition: 1 | Offset: 0 | Key: user-123 | Step: initiated
[PAYMENTS] Received | Partition: 1 | Offset: 1 | Key: user-123 | Step: auth_check
[PAYMENTS] Received | Partition: 1 | Offset: 2 | Key: user-123 | Step: processing
[PAYMENTS] Received | Partition: 1 | Offset: 3 | Key: user-123 | Step: completed
[PAYMENTS] Received | Partition: 1 | Offset: 4 | Key: user-123 | Step: notified
```

Все 5 сообщений в **одной партиции** (Partition 1) и строго по порядку offset 0→4.

**Если не видишь:** `docker-compose logs payments | grep -i fifo`

---

## 6. At-Least-Once и ручной Commit Offset

### 💡 Аналогия с RabbitMQ

В RabbitMQ у тебя есть `channel.ack(msg)` и `channel.nack(msg)`:

- `ack` → сообщение удалено из очереди (обработано успешно)
- `nack` → сообщение возвращается в очередь (обработка не удалась)

В Kafka нет ack/nack в таком понимании. Вместо этого есть **Offset Commit**:

- Consumer сообщает брокеру: "я прочитал и обработал все сообщения до offset N"
- Брокер запоминает этот committed offset для данной consumer group
- При рестарте consumer начинает читать с `committed offset + 1`

```
RabbitMQ ACK:
  Consumer обрабатывает → channel.ack(msg) → сообщение УДАЛЕНО из очереди

Kafka Offset Commit:
  Consumer обрабатывает → consumer.commitOffsets([{topic, partition, offset}])
  → Брокер запоминает: "group-X прочитала до offset 42"
  → Сообщение остаётся в топике!
  → При рестарте group-X начнёт с offset 43
```

---

### 📚 Технические детали

#### autoCommit: false — почему это обязательно в продакшене

По умолчанию KafkaJS делает `autoCommit: true` — commit выполняется автоматически каждые 5 секунд.

**Проблема autoCommit:**

```
t=0s:  Consumer получил сообщения offset 10, 11, 12
t=2s:  autoCommit сохранил offset 12
t=3s:  Consumer начал обрабатывать offset 12
t=4s:  CRASH! 💥
t=5s:  Consumer рестартует
       → начинает с offset 13 (committed был 12)
       → offset 12 потерян навсегда! 😱
```

**С ручным commit:**

```typescript
await consumer.run({
  autoCommit: false,
  eachMessage: async ({
    topic,
    partition,
    message,
    heartbeat,
    commitOffsets,
  }) => {
    try {
      await processMessage(message);
      await commitOffsets({
        // commit только после успешной обработки
        [topic]: {
          [partition]: { offset: (BigInt(message.offset) + 1n).toString() },
        },
      });
    } catch (error) {
      // не делаем commit → при рестарте сообщение придёт снова
      throw error;
    }
  },
});
```

#### Три семантики доставки

```
At-Most-Once (autoCommit до обработки):
  commit → обработка → crash?
  ✅ Нет дублей
  ❌ Потеря данных возможна

At-Least-Once (commit после обработки):
  обработка → commit → ok или crash перед commit?
  ✅ Нет потерь
  ❌ Дубли возможны (нужен Idempotency Guard!)

Exactly-Once (Kafka Transactions):
  atomic(обработка + commit) → либо оба, либо ни одного
  ✅ Нет потерь
  ✅ Нет дублей
  ❌ Сложнее, чуть медленнее
```

#### Consumer Group Offset хранится в Kafka

В RabbitMQ состояние очереди (что прочитано) хранится в самой очереди в памяти.
В Kafka committed offsets хранятся в специальном **внутреннем топике** `__consumer_offsets`.
Это означает: даже если все consumer instances упали, Kafka помнит, где они остановились.

---

### ▶ Попробуй сам — Шаг 6

У нас реализованы обе стратегии доставки через паттерн **DeliveryStrategy**:

#### 1. At-Least-Once (коммит ПОСЛЕ успешной обработки):
```bash
curl -X POST http://localhost:3000/kafka/learn/6-at-least-once \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-99", "amount": 500}'
```

**Смотри лог:** `docker compose logs payments`
```
[AtLeastOnce] Offset 12 (payment.created:10) успешно закоммичен ПОСЛЕ обработки
```
*Сначала выполняется бизнес-логика, потом фиксация смещения в брокере.*

---

#### 2. At-Most-Once (коммит ДО обработки — скорость и 0 дублей):
```bash
curl -X POST http://localhost:3000/kafka/learn/6-at-most-once \
  -H "Content-Type: application/json" \
  -d '{"email": "alex@speed.com"}'
```

**Смотри лог:** `docker compose logs auth`
```
[AtMostOnce] Offset 5 (user.login:1) закоммичен ДО обработки (0 дублей)
🔑 [AuthService] Пользователь вошел! ... At-Most-Once: Offset 5 закоммичен ДО выполнения бизнес-логики!
```
*Сначала брокер сдвигает оффсет, потом запускается обработчик.*

---

## 7. Idempotency Guard — Защита от дублей на Consumer

### 💡 Аналогия с RabbitMQ

В RabbitMQ при `nack + requeue=true` сообщение возвращается в очередь и придёт снова.
Опытные RabbitMQ-разработчики знают про дубли и обычно добавляют `UNIQUE INDEX` в PostgreSQL как защиту.

В Kafka при at-least-once — та же история. Consumer может получить одно сообщение дважды:

- crash после обработки, но до commit offset
- временная недоступность брокера → retry

**Решение** — **Idempotency Guard**: перед обработкой проверяй, обрабатывали ли мы уже это сообщение.

---

### 📚 Технические детали

#### Уникальный ключ идемпотентности

В Kafka у каждого сообщения есть **гарантированно уникальный** адрес:

```
idempotencyKey = `${topic}:${partition}:${offset}`

Например: "payment-events:1:42"
```

Это комбинация **никогда не повторяется** в рамках одного топика.
Именно это делает Kafka мощнее RabbitMQ для idempotency: ты не придумываешь ключ — ты используешь встроенный.

#### Реализация: In-Memory (демо) vs Production

**In-Memory Set (только для демо и разработки!):**

```typescript
const processedOffsets = new Set<string>();

async function processMessage({ topic, partition, message }) {
  const key = `${topic}:${partition}:${message.offset}`;

  if (processedOffsets.has(key)) {
    console.log(`[IDEMPOTENCY] Skipping duplicate: ${key}`);
    return; // дубль, пропускаем
  }

  await doActualWork(message);
  processedOffsets.add(key);
}
```

**Проблема:** In-Memory Set сбрасывается при рестарте! После рестарта дубли снова пройдут.

**Production: Redis:**

```typescript
async function processMessage({ topic, partition, message }) {
  const key = `idempotency:${topic}:${partition}:${message.offset}`;

  // SET key value NX EX 86400 — атомарная операция
  const isNew = await redis.set(key, '1', 'NX', 'EX', 86400);

  if (!isNew) {
    console.log(`[IDEMPOTENCY] Duplicate detected, skipping`);
    return;
  }

  await doActualWork(message);
}
```

**Production: PostgreSQL:**

```typescript
await db.query(
  `
  INSERT INTO processed_messages (topic, partition, offset, processed_at)
  VALUES ($1, $2, $3, NOW())
  ON CONFLICT (topic, partition, offset) DO NOTHING
`,
  [topic, partition, message.offset],
);
```

#### Idempotency на уровне бизнес-логики (лучший подход)

```typescript
// Вместо хранения offset — хранить бизнес-идентификатор
await db.query(
  `
  INSERT INTO payments (id, user_id, amount, status)
  VALUES ($1, $2, $3, 'completed')
  ON CONFLICT (id) DO NOTHING  -- id = payload.paymentId, а не offset!
`,
  [payload.paymentId, payload.userId, payload.amount],
);
```

Это надёжнее: даже если данные пришли из другого источника, дубль будет заблокирован.

---

### ▶ Попробуй сам — Шаг 7

Отправь одинаковые данные дважды:

```bash
# Первый раз — обработается
curl -X POST http://localhost:3000/kafka/learn/7-idempotency \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "pay-777", "amount": 100}'

# Второй раз — будет пропущен!
curl -X POST http://localhost:3000/kafka/learn/7-idempotency \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "pay-777", "amount": 100}'
```

**Смотри лог:** `docker-compose logs payments`

**Ты увидишь:**

```
[PAYMENTS] Processing payment pay-777 | Partition: 0 | Offset: 10
[PAYMENTS] Payment pay-777 processed successfully

[PAYMENTS] Duplicate detected | Key: payment-events:0:10 | Skipping
```

Второе сообщение **пропущено** благодаря Idempotency Guard.

**Если не видишь:** `docker-compose logs payments | grep -i idempoten`

---

## 8. Dead Letter Topic (DLT)

### 💡 Аналогия с RabbitMQ

В RabbitMQ есть **Dead Letter Exchange (DLX)** — специальный exchange, куда попадают сообщения после:

- `nack` с `requeue=false`
- истечения TTL
- переполнения очереди

В Kafka аналогичный паттерн называется **Dead Letter Topic (DLT)**.
После N неудачных попыток обработки сообщение отправляется в специальный топик `<original-topic>.DLT`.

```
RabbitMQ DLX:
  Queue → [3 retries fail] → x-dead-letter-exchange → DL Queue

Kafka DLT:
  Topic → [3 retries fail] → producer.send(topic.DLT, enrichedMessage)
```

---

### 📚 Технические детали

#### Retry Loop с экспоненциальной задержкой

```typescript
async function processWithRetry(message, maxRetries = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processMessage(message);
      return; // успех!
    } catch (error) {
      lastError = error;
      console.log(`[DLT] Attempt ${attempt}/${maxRetries} failed`);

      if (attempt < maxRetries) {
        // экспоненциальная задержка: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  // Все попытки исчерпаны → отправляем в DLT
  await sendToDLT(message, lastError);
}
```

#### Структура DLT-сообщения

DLT должен содержать всё необходимое для анализа и ручной обработки:

```json
{
  "originalPayload": { "orderId": "ord-123", "amount": 500 },
  "failureReason": "PaymentGatewayTimeoutError: Gateway did not respond in 5000ms",
  "retryCount": 3,
  "failedAt": "2024-01-15T10:30:45Z",
  "originalTopic": "payment-events",
  "originalPartition": 1,
  "originalOffset": "42",
  "originalKey": "user-123",
  "stackTrace": "Error: ...\n  at PaymentService.process ..."
}
```

#### Топология DLT в продакшене

```
payment-events (основной топик)
  ├── Consumer Group "payments-processor"
  │     ├── Attempt 1 → fail
  │     ├── Attempt 2 → fail
  │     └── Attempt 3 → fail
  │           ↓
  └── payment-events.DLT (Dead Letter Topic)
        └── Consumer Group "payments-dlt-processor"
              ├── Алерт в Slack/PagerDuty
              ├── Запись в таблицу failed_events
              └── (опционально) ручная обработка через API
```

#### Мониторинг DLT

```
Правило алертинга: если в DLT-топике есть непрочитанные сообщения → ALERT!

Grafana: kafka_consumer_group_lag{topic=~".*\\.DLT"} > 0
```

В Kafbat UI: Topics → `payment-events.DLT` → Messages — смотри все неудачные попытки.

---

### ▶ Попробуй сам — Шаг 8

```bash
curl -X POST http://localhost:3000/kafka/learn/8-dlt \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-fail-001", "amount": 9999, "simulateFailure": true}'
```

**Смотри лог:** `docker-compose logs payments`

**Ты увидишь:**

```
[PAYMENTS] Processing order-fail-001 | Attempt: 1/3
[PAYMENTS] ERROR: Simulated failure for order-fail-001
[PAYMENTS] Processing order-fail-001 | Attempt: 2/3
[PAYMENTS] ERROR: Simulated failure for order-fail-001
[PAYMENTS] Processing order-fail-001 | Attempt: 3/3
[PAYMENTS] ERROR: Simulated failure for order-fail-001
[PAYMENTS] Max retries exceeded. Sending to DLT: payment-events.DLT
[PAYMENTS] DLT message sent | Offset: 0 | FailureReason: Simulated failure
```

После этого проверь в Kafbat UI: Topics → `payment-events.DLT` — увидишь DLT-сообщение.

**Если не видишь:** `docker-compose logs payments | grep -i dlt`

---

## 9. eachBatch — Пакетная обработка

### 💡 Аналогия с RabbitMQ

В RabbitMQ `prefetch=1` — обрабатываешь одно сообщение за раз.
`prefetch=100` — у тебя в памяти 100 сообщений, но ты всё равно обрабатываешь их в `eachMessage`-подобном цикле.

В Kafka `eachBatch` — это принципиально другой режим: ты получаешь **целый массив сообщений** за один вызов и можешь делать с ними bulk-операции.

```
eachMessage (аналог RabbitMQ prefetch=1):
  [msg1] → обработка → commit
  [msg2] → обработка → commit
  [msg3] → обработка → commit
  ⟹ 3 round-trip к базе, 3 commit

eachBatch (bulk режим):
  [msg1, msg2, msg3, msg4, msg5, ...msg100] → batch-insert в БД → один commit
  ⟹ 1 round-trip к базе, 1 commit
  ⟹ В 10-100x быстрее для high-throughput сценариев!
```

---

### 📚 Технические детали

#### Структура eachBatch

```typescript
await consumer.run({
  eachBatch: async ({
    batch,
    resolveOffset,
    heartbeat,
    isRunning,
    isStale,
  }) => {
    const { topic, partition, messages } = batch;

    console.log(`Received batch: ${messages.length} messages`);

    // Можно делать bulk-операции!
    const payloads = messages.map((m) => JSON.parse(m.value.toString()));
    await db.bulkInsert('notifications', payloads); // один SQL запрос!

    // resolveOffset: помечаем каждое сообщение обработанным
    for (const message of messages) {
      if (!isRunning() || isStale()) break; // graceful shutdown

      await heartbeat(); // критически важно! (см. ниже)
      resolveOffset(message.offset); // частичный commit батча
    }
  },
});
```

#### heartbeat() — почему обязателен в eachBatch

В `eachMessage` heartbeat отправляется автоматически.
В `eachBatch` — ты сам отвечаешь за отправку heartbeat.

Если heartbeat не отправлять:

```
sessionTimeout = 30s (по умолчанию)

Consumer обрабатывает батч из 1000 сообщений → занимает 45 секунд
Broker: "consumer не отвечает уже 30 секунд → считаем его мёртвым"
Broker: "запускаем rebalance!"
Consumer: "закончил обработку, пытаюсь commit..."
Broker: "ты уже не в группе, твой commit отклонён"
→ Все 1000 сообщений придут снова!
```

**Правило:** вызывай `heartbeat()` минимум раз в `sessionTimeout / 3` секунд.

#### resolveOffset() — частичный commit

```typescript
// Если батч = [msg0, msg1, msg2, msg3, msg4]
// и msg3 упал — resolveOffset позволяет сохранить прогресс

for (const message of messages) {
  try {
    await processMessage(message);
    resolveOffset(message.offset); // запоминаем успешно обработанный offset
  } catch (error) {
    // msg3 упал → при рестарте начнём с msg3, а не с msg0
    break;
  }
}
```

#### Настройки для оптимального батча

```typescript
const consumer = kafka.consumer({
  groupId: 'notifications-batch',
  minBytes: 1024 * 1024, // минимум 1MB перед отправкой батча
  maxBytes: 10 * 1024 * 1024, // максимум 10MB за батч
  maxWaitTimeInMs: 500, // ждать не более 500ms для накопления батча
});
```

---

### ▶ Попробуй сам — Шаг 9

```bash
curl -X POST http://localhost:3000/kafka/learn/9-batch \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "type": "push-notification"}'
```

**Смотри лог:** `docker-compose logs notifications`

**Ты увидишь:**

```
[NOTIFICATIONS] eachBatch invoked | BatchSize: 10 | Partition: 0
[NOTIFICATIONS] Processing messages 0 to 9
[NOTIFICATIONS] Bulk insert: 10 notifications saved in 1 DB call
[NOTIFICATIONS] heartbeat() sent at message 5/10
[NOTIFICATIONS] resolveOffset: committed up to offset 25
```

Сравни с `eachMessage`: был бы 10 отдельных логов вместо одного batch-лога.

**Если не видишь:** `docker-compose logs notifications | grep -i batchsize`

---

## 10. Seek — Путешествие во времени

### 💡 Аналогия с RabbitMQ — и почему это Kafka-superpower

В RabbitMQ: сообщение обработано + ack → **удалено навсегда**. Replay невозможен.
Единственный способ "replay" — это ты сам должен был сохранить данные куда-то ещё.

В Kafka: сообщение хранится N дней независимо от того, сколько раз его прочитали.
**Seek** позволяет consumer group перемотать назад к любому offset и переиграть историю.

```
RabbitMQ — дорога с односторонним движением:
  msg1 → msg2 → msg3 → [ACK] → пустота

Kafka — лента с перемоткой:
  [msg1][msg2][msg3][msg4][msg5][msg6]...
     ↑                              ↑
  начало                          конец

  consumer.seek({ offset: '0' })  → читаем всё с начала!
  consumer.seek({ offset: '3' })  → читаем с msg4!
```

---

### 📚 Технические детали

#### Практические сценарии использования Seek

**Сценарий 1: Нашли баг в обработчике**

```
Prod: обрабатывали платежи с offset 100 по offset 5000
Нашли баг: неправильно конвертировали валюту для EUR
Починили код, задеплоили

Решение:
1. consumer.seek({ topic: 'payment-events', partition: 0, offset: '100' })
2. Consumer Group начинает с offset 100
3. Все EUR-платежи пересчитаны правильно!
```

**Сценарий 2: Новый сервис должен обработать всю историю**

```
Запустили новый аналитический сервис
Нужно обработать события за последние 30 дней

Решение:
kafka.consumer({ groupId: 'analytics-NEW' })
→ Новая группа начинает с auto.offset.reset: 'earliest'
→ Читает всё с самого начала топика
→ Никак не влияет на другие consumer groups!
```

**Сценарий 3: Replay конкретного временного диапазона**

```typescript
// Seek к конкретному timestamp
const offsets = await admin.fetchTopicOffsetsByTime([
  { topic: 'payment-events', timestamp: Date.parse('2024-01-15T00:00:00Z') },
]);
consumer.seek({
  topic: 'payment-events',
  partition: 0,
  offset: offsets[0].offset,
});
```

#### auto.offset.reset — что происходит при первом запуске новой group

```
auto.offset.reset: 'earliest'  → начать с самого первого сообщения в топике
auto.offset.reset: 'latest'    → начать только с новых сообщений (пропустить историю)
auto.offset.reset: 'none'      → выбросить ошибку если нет committed offset
```

В RabbitMQ аналога нет: новая очередь всегда пустая.
В Kafka новая consumer group может прочитать **всю историю топика** — это уникальная возможность.

#### Seek API в KafkaJS

```typescript
consumer.on(consumer.events.GROUP_JOIN, async () => {
  // Вызывай seek ПОСЛЕ присоединения к группе
  consumer.seek({
    topic: 'notification-events',
    partition: 0,
    offset: '0', // начать с самого начала
  });
});
```

---

### ▶ Попробуй сам — Шаг 10

Сначала убедись, что в топике `notification-events` есть сообщения (отправь /9-batch).
Затем сделай seek к offset 0:

```bash
curl -X GET http://localhost:3000/kafka/learn/10-seek/0
```

**Смотри лог:** `docker-compose logs notifications`

**Ты увидишь:**

```
[NOTIFICATIONS] Seek requested to offset 0 | Partition: 0
[NOTIFICATIONS] Replaying from offset 0...
[NOTIFICATIONS] Replayed | Partition: 0 | Offset: 0 | Msg: push-notification
[NOTIFICATIONS] Replayed | Partition: 0 | Offset: 1 | Msg: push-notification
...
[NOTIFICATIONS] Replayed | Partition: 0 | Offset: 9 | Msg: push-notification
[NOTIFICATIONS] Replay complete: 10 messages re-processed
```

Все 10 сообщений из батча переиграны! В RabbitMQ такое невозможно.

**Если не видишь:** `docker-compose logs notifications | grep -i replay`

---

## 11. Kafka Transactions — Exactly-Once

### 💡 Аналогия с RabbitMQ

В RabbitMQ нет встроенных транзакций между несколькими очередями.
Стандартный паттерн — **Transactional Outbox**: сначала пишешь событие в таблицу `outbox` в той же PostgreSQL-транзакции, что и бизнес-данные, потом Outbox Processor читает и отправляет в RabbitMQ.

В Kafka **транзакции встроены в брокер**. Ты можешь атомарно записать в несколько топиков — либо всё, либо ничего.

```
RabbitMQ Transactional Outbox:
  BEGIN TX
    UPDATE orders SET status='paid' WHERE id=123
    INSERT INTO outbox VALUES ('payment.completed', payload)
  COMMIT TX
  → Outbox Worker читает и отправляет в RabbitMQ
  (2 системы, eventual consistency, задержка)

Kafka Transactions:
  producer.transaction(async (txn) => {
    await txn.send({ topic: 'payment-events',      message: paymentMsg });
    await txn.send({ topic: 'notification-events', message: notifyMsg });
    await txn.commit();  // атомарно! обе записи или ни одной
  });
  (1 система, атомарно, нет задержки)
```

---

### 📚 Технические детали

#### Как Kafka Transactions работают внутри

Kafka использует три компонента для exactly-once:

**1. Producer ID (PID) + Epoch**

```
При инициализации transactional producer:
  Kafka назначает PID = 42, Epoch = 1

При рестарте того же producer (transactionalId = "payment-service"):
  Kafka выдаёт PID = 42, Epoch = 2  ← Epoch увеличивается!
  Старые "зомби"-инстансы с Epoch=1 будут отклонены
```

**2. Sequence Numbers**

```
Каждое сообщение от producer имеет sequence number:
  PID=42, Epoch=1, Seq=0: {payment.initiated}
  PID=42, Epoch=1, Seq=1: {payment.completed}

Брокер отклоняет дубли: если Seq=1 пришёл дважды → второй игнорируется
```

**3. Transaction Coordinator**

```
Специальный брокер-координатор управляет 2-phase commit:
  Phase 1: producer.beginTransaction()
           → coordinator записывает "транзакция началась"
  Phase 2: producer.commitTransaction()
           → coordinator записывает "транзакция завершена"

Consumer с isolation.level='read_committed' видит только committed-транзакции
```

#### Код Kafka Transactions в KafkaJS

```typescript
const producer = kafka.producer({
  transactionalId: 'payment-service-txn-1', // уникальный ID!
  idempotent: true, // обязательно с транзакциями
  maxInFlightRequests: 1,
});

await producer.connect();
const transaction = await producer.transaction();

try {
  // Атомарная запись в ДВА топика
  await transaction.send({
    topic: 'payment-events',
    messages: [{ key: userId, value: JSON.stringify(paymentPayload) }],
  });

  await transaction.send({
    topic: 'notification-events',
    messages: [{ value: JSON.stringify(notificationPayload) }],
  });

  await transaction.commit(); // ✅ оба сообщения видимы consumers
  console.log('Transaction committed successfully');
} catch (error) {
  await transaction.abort(); // ❌ ни одно сообщение не видимо
  console.log('Transaction aborted, no messages published');
  throw error;
}
```

#### Consumer: read_committed vs read_uncommitted

```typescript
const consumer = kafka.consumer({
  groupId: 'payments-exactly-once',
  readUncommitted: false, // false = read_committed (по умолчанию в KafkaJS)
});
// read_committed:   видим только сообщения из завершённых транзакций
// read_uncommitted: видим всё, включая in-progress транзакции (может создать дубли!)
```

---

### ▶ Попробуй сам — Шаг 11

#### Тест 1: Успешная фиксация (COMMIT в 2 топика)

```bash
curl -X POST http://localhost:3000/kafka/learn/11-transactions \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-txn-001", "amount": 2500}'
```

**Смотри лог двух сервисов одновременно:**
```bash
docker-compose logs -f payments notifications
```

**Ты увидишь:**
```
[PAYMENTS]      💳 Получено событие: PAYMENT_CREATED | Сумма: 2500 | User: user-txn-001
[NOTIFICATIONS] 📬 Получено событие: RESERVATION_CONFIRMED | User: user-txn-001
```
Оба сервиса получили сообщение **атомарно** — в рамках одной транзакции.

---

#### Тест 2: Имитация аварии и отката (ABORT)

```bash
curl -X POST http://localhost:3000/kafka/learn/11-transactions \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-txn-001", "amount": 2500, "simulateFailure": true}'
```

**В ответе эндпоинта ты получишь:**
```json
{
  "step": 11,
  "concept": "Kafka Transactions — Откат транзакции (ABORT)",
  "status": "ABORTED ❌",
  "error": "💥 Искусственный сбой бизнес-логики...",
  "whatHappened": [
    "1. Сообщение #1 было физически отправлено в payment.created продюсером",
    "2. Сработал simulateFailure → выброшен Error перед записью #2",
    "3. Вызван transaction.abort() → брокер записал Abort Marker",
    "4. Консьюмеры с read_committed отфильтровали и НЕ прочитали сообщение #1!"
  ]
}
```

**Смотри логи:** ни в `payments`, ни в `notifications` **не появится ни одного сообщения**! Брокер пометил их Abort Marker и консьюмеры их пропустили.

---

## 12. Consumer Groups — Fan-out через группы

### 💡 Аналогия с RabbitMQ

**Fan-out в RabbitMQ:**

```
Fanout Exchange
    ├── Queue A → Consumer "payments-service"
    ├── Queue B → Consumer "notifications-service"
    └── Queue C → Consumer "analytics-service"

Нужно: 3 очереди + 3 binding + настройка exchange
```

**Fan-out в Kafka:**

```
Topic "order-events"
    ├── Consumer Group "payments-workers"      → читает все сообщения
    ├── Consumer Group "notifications-workers" → читает все сообщения независимо
    └── Consumer Group "analytics-workers"     → читает все сообщения независимо

Нужно: просто 3 разных groupId. Всё.
```

---

### 📚 Технические детали

#### Consumer Group — фундаментальная концепция

**Consumer Group** = логическое объединение consumer instances, которые вместе читают **один топик**.

```
Topic "order-events" (3 партиции) + Consumer Group "payments":

┌─────────────────────────────────────────────┐
│ Consumer Group "payments"                   │
│                                             │
│ Instance A ──читает──► Partition 0          │
│ Instance B ──читает──► Partition 1          │
│ Instance C ──читает──► Partition 2          │
│                                             │
│ Правило: 1 партиция = 1 consumer в группе  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Consumer Group "notifications"              │
│                                             │
│ Instance X ──читает──► Partition 0          │
│ Instance Y ──читает──► Partition 1          │
│ Instance Z ──читает──► Partition 2          │
│                                             │
│ Полностью независимый offset от "payments"! │
└─────────────────────────────────────────────┘
```

#### Rebalancing — перераспределение партиций

При добавлении или удалении consumer instance происходит **rebalance**:

```
До rebalance (2 instances, 4 партиции):
  Instance A: Partition 0, Partition 1
  Instance B: Partition 2, Partition 3

Добавили Instance C → rebalance:
  Instance A: Partition 0, Partition 1
  Instance B: Partition 2
  Instance C: Partition 3  ← забрала у B

Во время rebalance: обработка остановлена на несколько секунд!
→ Это нормально, но минимизируй лишние рестарты
```

Настройки для уменьшения rebalance-storm:

```typescript
const consumer = kafka.consumer({
  groupId: 'payments-workers',
  sessionTimeout: 30000, // 30s — брокер ждёт heartbeat
  heartbeatInterval: 3000, // 3s — consumer посылает heartbeat
  rebalanceTimeout: 60000, // 60s — максимальное время rebalance
});
```

#### Независимые Offsets для каждой группы

```
Topic "order-events":
  Partition 0: [offset 0][offset 1][offset 2]...[offset 999]

Consumer Group "payments":
  committed offset = 750  → читает дальше с 751

Consumer Group "notifications":
  committed offset = 999  → всё прочитано, lag = 0

Consumer Group "analytics" (новая):
  committed offset = нет → начинает с earliest = offset 0!
  (вся история доступна!)
```

Это **невозможно в RabbitMQ**: новая очередь всегда пустая. Новая consumer group в Kafka может прочитать годы истории.

#### Lag — ключевая метрика

```
Consumer Lag = (Latest Offset в топике) - (Committed Offset группы)

Lag = 0    → группа успевает за producer ✅
Lag = 1000 → группа отстаёт на 1000 сообщений ⚠️ (нужно масштабировать!)
Lag растёт → consumer не справляется, нужно больше instances или оптимизация
```

Мониторинг в Kafbat UI: Consumer Groups → выбери группу → видишь lag по каждой партиции.

---

### ▶ Попробуй сам — Шаг 12

```bash
curl -X POST http://localhost:3000/kafka/learn/12-consumer-groups \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-fanout-001", "userId": "user-001", "amount": 750}'
```

**Смотри лог двух сервисов одновременно:**

```bash
docker-compose logs -f payments notifications
```

**Ты увидишь:**

```
[PAYMENTS]      Received via group "payments-workers"      | OrderId: order-fanout-001
[PAYMENTS]      Processing payment for user-001, amount: 750

[NOTIFICATIONS] Received via group "notifications-workers" | OrderId: order-fanout-001
[NOTIFICATIONS] Sending notification to user-001: "Your order is being processed"
```

**Одно сообщение** → **два независимых сервиса** получили его одновременно через разные consumer groups. Fan-out без единой дополнительной конфигурации на уровне топика!

**Смотри в Kafbat UI:** Consumer Groups → ты увидишь обе группы с их lag-метриками.

**Если не видишь:** `docker-compose logs payments notifications | grep -i "order-fanout"`

---

## 📋 Шпаргалка: RabbitMQ vs Kafka

| Концепция        | RabbitMQ                      | Kafka                         |
| ---------------- | ----------------------------- | ----------------------------- |
| Хранение         | Очередь (удаляется после ACK) | Журнал (хранится N дней)      |
| Exchange         | Exchange + Queue              | Topic                         |
| Маршрутизация    | Routing Key → Binding         | Consumer Group                |
| Порядок          | FIFO на всю очередь           | FIFO на партицию              |
| Повторное чтение | Невозможно                    | Seek к любому offset          |
| Fan-out          | Fanout Exchange → N Queue     | N Consumer Groups             |
| ACK              | channel.ack(msg)              | commitOffsets({offset})       |
| Dead Letter      | Dead Letter Exchange          | Dead Letter Topic             |
| Транзакции       | Transactional Outbox          | Kafka Transactions (встроено) |
| Масштабирование  | Prefetch + N consumers        | N партиций = N consumers      |
| Мониторинг       | RabbitMQ Management :15672    | Kafbat UI :8080               |
| Идемпотентность  | UNIQUE INDEX в БД             | topic:partition:offset ключ   |

---

## 🛠 Полезные команды

```bash
# Смотреть все логи вместе
docker-compose logs -f auth payments notifications

# Найти конкретное сообщение
docker-compose logs payments | grep "order-123"

# Смотреть только ошибки
docker-compose logs payments | grep -i error

# Перезапустить один сервис
docker-compose restart payments

# Проверить offset consumer group через kafka CLI
docker exec -it kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group payments-workers \
  --describe

# Список всех топиков
docker exec -it kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list

# Просмотр сообщений в топике (с самого начала)
docker exec -it kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic payment-events \
  --from-beginning \
  --max-messages 10
```

---

## 🔗 Дополнительные ресурсы

- **Гайд по масштабированию:** [KAFKA_SCALING_GUIDE.md](./KAFKA_SCALING_GUIDE.md) — брокеры, кластер, партиции, Consumer Groups, сравнение с RabbitMQ
- **Kafbat UI:** http://localhost:8080 — веб-интерфейс для Kafka (аналог RabbitMQ Management)
- **Официальная документация KafkaJS:** https://kafka.js.org/docs/getting-started
- **Kafka Design:** https://kafka.apache.org/documentation/#design
- **Confluent — Understanding Kafka:** https://developer.confluent.io/learn-kafka/

---

_Это руководство — живой документ. Каждый раздел соответствует работающему эндпоинту в этом проекте. Запусти, потрогай, посмотри логи — Kafka познаётся в бою._

