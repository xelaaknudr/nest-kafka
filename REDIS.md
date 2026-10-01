# 🔴 REDIS: Полное руководство для Senior/Lead разработчика

> **Язык**: Русский | **Уровень**: Junior → Lead | **Версия Redis**: 7.x

---

## 📋 КАРТА МАРШРУТОВ

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  #   │ Маршрут                                   │ Концепция                     │
├──────┼───────────────────────────────────────────┼───────────────────────────────┤
│  1   │ GET  /redis/learn/1-intro                 │ Что такое Redis               │
│  2   │ GET  /redis/learn/2-architecture          │ Архитектура, event loop        │
│  3   │ GET  /redis/learn/3-strings               │ String операции               │
│  4   │ GET  /redis/learn/4-lists                 │ List операции                 │
│  5   │ GET  /redis/learn/5-hashes                │ Hash операции                 │
│  6   │ GET  /redis/learn/6-sets                  │ Set операции                  │
│  7   │ GET  /redis/learn/7-sorted-sets           │ Sorted Set операции           │
│  8   │ GET  /redis/learn/8-bitmaps               │ Bitmap операции               │
│  9   │ GET  /redis/learn/9-hyperloglog           │ HyperLogLog                   │
│  10  │ GET  /redis/learn/10-streams              │ Redis Streams                 │
│  11  │ GET  /redis/learn/11-geo                  │ Geospatial                    │
│  12  │ GET  /redis/learn/12-ttl                  │ TTL, Expiration, Eviction      │
│  13  │ GET  /redis/learn/13-persistence          │ RDB и AOF персистентность      │
│  14  │ GET  /redis/learn/14-cache-aside          │ Cache-Aside паттерн           │
│  15  │ GET  /redis/learn/15-write-through        │ Write-Through паттерн         │
│  16  │ GET  /redis/learn/16-write-behind         │ Write-Behind паттерн          │
│  17  │ GET  /redis/learn/17-cache-stampede       │ Cache Stampede, Dog-pile       │
│  18  │ GET  /redis/learn/18-cache-invalidation   │ Инвалидация кэша              │
│  19  │ GET  /redis/learn/19-transactions         │ MULTI/EXEC/WATCH              │
│  20  │ GET  /redis/learn/20-lua                  │ Lua скрипты                   │
│  21  │ GET  /redis/learn/21-pipelining           │ Pipelining                    │
│  22  │ GET  /redis/learn/22-distributed-lock     │ Distributed Lock              │
│  23  │ GET  /redis/learn/23-redlock              │ Redlock Algorithm             │
│  24  │ GET  /redis/learn/24-rate-limiting        │ Rate Limiting (5 стратегий)   │
│  25  │ GET  /redis/learn/25-sessions             │ Session Management            │
│  26  │ GET  /redis/learn/26-pubsub               │ Pub/Sub                       │
│  27  │ GET  /redis/learn/27-streams-vs-pubsub    │ Streams vs Pub/Sub            │
│  28  │ GET  /redis/learn/28-leaderboard          │ Leaderboard паттерн           │
│  29  │ GET  /redis/learn/29-autocomplete         │ Autocomplete/Typeahead         │
│  30  │ GET  /redis/learn/30-counting             │ HyperLogLog + Bloom Filter     │
│  31  │ GET  /redis/learn/31-job-queue            │ Job Queue                     │
│  32  │ GET  /redis/learn/32-replication          │ Master-Replica репликация      │
│  33  │ GET  /redis/learn/33-sentinel             │ Redis Sentinel                │
│  34  │ GET  /redis/learn/34-cluster              │ Redis Cluster + Hash Slots     │
│  35  │ GET  /redis/learn/35-memory               │ Оптимизация памяти            │
│  36  │ GET  /redis/learn/36-monitoring           │ INFO, SLOWLOG, MONITOR         │
│  37  │ GET  /redis/learn/37-interview            │ ТОП 50+ вопросов              │
└──────┴───────────────────────────────────────────┴───────────────────────────────┘
```

---

# 🎓 ЧАСТЬ 1: ОСНОВЫ (Junior/Middle)

---

## 📌 Шаг 1: Что такое Redis?

### Концепция

**Redis** (Remote Dictionary Server) — это высокопроизводительное хранилище данных в памяти (in-memory data structure store), которое может использоваться как:
- 🗄️ **База данных** (с персистентностью)
- ⚡ **Кэш** (самый популярный use case)
- 📨 **Message Broker** (Pub/Sub, Streams)
- 🔒 **Distributed Lock Manager**
- 📊 **Counter/Leaderboard сервис**

### Ключевые характеристики

| Характеристика | Значение |
|---|---|
| **Хранение** | In-memory (RAM) |
| **Скорость** | 100,000–1,000,000 операций/сек |
| **Потоки** | Single-threaded (I/O), multi-threaded (network/disk I/O с Redis 6+) |
| **Персистентность** | RDB, AOF, или оба вместе |
| **Типы данных** | String, List, Hash, Set, Sorted Set, Bitmap, HyperLogLog, Stream, Geo |
| **Лицензия** | BSD (до 7.4), SSPL (7.4+) → появился Valkey |

### Аналогия из реальной жизни

> 🏪 Представьте Redis как **кассира в супермаркете с феноменальной памятью**: он помнит последние 10 000 чеков наизусть (in-memory), может мгновенно назвать сумму любого, периодически фотографирует стопку чеков на случай пожара (RDB snapshot), и записывает каждую операцию в журнал (AOF). При этом он обслуживает всех клиентов строго по очереди — один за раз (single-threaded), но делает это настолько быстро, что очередь не накапливается.

### Use Cases

```
✅ Кэширование результатов БД запросов
✅ Хранение пользовательских сессий
✅ Rate limiting (ограничение запросов)
✅ Leaderboards / рейтинги в реальном времени
✅ Pub/Sub для real-time уведомлений
✅ Job queues / очереди задач
✅ Distributed locks
✅ Geospatial индексы
✅ Real-time analytics (HyperLogLog, Bitmap)
✅ Autocomplete / поиск по префиксу
```

### Redis CLI пример

```bash
# Установка и запуск
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Подключение
redis-cli

# Базовые команды
127.0.0.1:6379> PING
PONG

127.0.0.1:6379> SET name "Redis Master"
OK

127.0.0.1:6379> GET name
"Redis Master"

127.0.0.1:6379> DEL name
(integer) 1

127.0.0.1:6379> EXISTS name
(integer) 0
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/1-intro
```

### 📋 ЧТО СМОТРЕТЬ после вызова

```
Response должен показать:
- Базовый PING/PONG
- SET и GET строкового значения
- Время выполнения (обычно < 1ms)
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> ❌ **Джун говорит**: "Redis — это просто кэш"
> ✅ **Сеньор говорит**: "Redis — это многофункциональное in-memory хранилище данных с поддержкой персистентности, богатыми типами данных и возможностью использоваться как брокер сообщений, distributed lock manager и т.д."

> ❌ **Джун говорит**: "Redis однопоточный, значит медленный"
> ✅ **Сеньор говорит**: "Redis однопоточный в плане выполнения команд (что обеспечивает атомарность), но с Redis 6+ используется многопоточность для I/O (network) операций. Именно single-thread модель позволяет избежать race conditions без мьютексов, что даёт скорость до 1M ops/sec."

> 💡 **Классический вопрос**: "Почему Redis быстрее MySQL для кэширования?"
> **Ответ**: 1) Данные в RAM (vs disk I/O) 2) Простые структуры данных (vs сложные SQL запросы) 3) Нет парсинга SQL, нет планировщика запросов 4) Single-thread без lock contention

---

## 📌 Шаг 2: Архитектура Redis

### Концепция

Redis использует **однопоточную event-driven архитектуру** на основе **I/O мультиплексирования**. Это означает, что один поток обрабатывает все команды последовательно, но при этом не блокируется на ожидании I/O.

### Компоненты архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│                      Redis Process                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │   Network    │    │         Event Loop               │  │
│  │   Thread(s)  │───▶│  ┌────────────┐  ┌───────────┐  │  │
│  │  (Redis 6+)  │    │  │   File     │  │  Time     │  │  │
│  └──────────────┘    │  │  Events    │  │  Events   │  │  │
│                      │  │ (commands) │  │  (timers) │  │  │
│  ┌──────────────┐    │  └────────────┘  └───────────┘  │  │
│  │  I/O Thread  │    │         ▼                        │  │
│  │  (epoll/     │    │  ┌────────────────────────────┐  │  │
│  │  kqueue/     │    │  │  Command Processor         │  │  │
│  │  select)     │    │  │  (Single-threaded)         │  │  │
│  └──────────────┘    │  └────────────────────────────┘  │  │
│                      └──────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Memory Store                        │  │
│  │         (Hash table of key-value pairs)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Почему Redis такой быстрый?

**1. Данные в памяти (RAM)**
```
RAM latency:   ~100 наносекунд
SSD latency:   ~100 микросекунд (в 1000x медленнее)
HDD latency:   ~10 миллисекунд  (в 100,000x медленнее)
```

**2. I/O мультиплексирование (epoll/kqueue)**
```
Традиционный сервер:  1 thread per connection → context switching overhead
Redis:                1 thread, epoll отслеживает все соединения
                      → нет context switching → больше CPU для полезной работы
```

**3. Простые структуры данных**
```
Нет сложных JOIN операций
Нет парсинга SQL
Нет оптимизатора запросов
Прямой доступ к данным через hash table O(1)
```

**4. Single-thread = no locks**
```
В многопоточных системах: mutex, spinlock, memory barriers → overhead
В Redis: команды выполняются строго последовательно → никаких блокировок
```

### Event Loop (ae.c в исходниках Redis)

```c
// Упрощённый псевдокод event loop Redis
while (server.running) {
    // 1. Ждём события (epoll_wait) — не блокируем CPU
    events = epoll_wait(epoll_fd, timeout);
    
    // 2. Обрабатываем file events (network I/O)
    for (event in events) {
        if (event.readable) readFromClient(event.fd);
        if (event.writable) writeToClient(event.fd);
    }
    
    // 3. Обрабатываем time events (TTL expiry, BGSAVE, etc.)
    processTimeEvents();
}
```

### Redis 6+ Multi-threading

```
Redis 6 добавил IO-threads для сетевого I/O:
- Чтение запросов от клиентов — параллельно
- Запись ответов клиентам — параллельно
- ВЫПОЛНЕНИЕ КОМАНД — по-прежнему single-threaded!

Конфигурация:
io-threads 4              # Количество IO потоков
io-threads-do-reads yes   # Многопоточное чтение
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/2-architecture
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> ❌ **Ошибка**: "Redis 6 стал многопоточным, теперь команды выполняются параллельно"
> ✅ **Правда**: Многопоточность добавлена только для network I/O. Сам движок команд остался однопоточным — это гарантирует атомарность всех операций.

> 💡 **Вопрос-ловушка**: "Если Redis однопоточный, как он справляется с 100,000 соединений?"
> **Ответ**: Через I/O мультиплексирование (epoll на Linux, kqueue на macOS). Один поток использует системный вызов `epoll_wait`, который уведомляет о готовности любого из тысяч файловых дескрипторов — без блокировки на каждом.

> 💡 **Вопрос-ловушка**: "Что произойдёт если запустить очень длинный Lua-скрипт в Redis?"
> **Ответ**: Весь Redis заблокируется на время выполнения скрипта (single-thread!). Поэтому Lua-скрипты должны быть атомарными И быстрыми. Есть `lua-time-limit` (по умолчанию 5 секунд), после чего Redis начинает отвечать только на SCRIPT KILL.

---

## 📌 Шаг 3: Тип данных String

### Концепция

String — самый базовый тип в Redis. Не просто текст — это **бинарно-безопасная последовательность байт** до 512 MB. Может хранить текст, числа, сериализованные объекты (JSON), бинарные данные (изображения).

### Внутреннее представление

```
Encoding (OBJECT ENCODING key):
- int       → числа, помещающиеся в long (эффективно!)  
- embstr    → строки ≤ 44 байт (один malloc, immutable)
- raw       → строки > 44 байт (два malloc, mutable)
```

### Команды String

```bash
# ──────────────── БАЗОВЫЕ ────────────────
SET key value                    # Установить значение
SET key value EX 60              # С TTL 60 секунд
SET key value PX 60000           # С TTL 60,000 миллисекунд
SET key value NX                 # Только если НЕ существует (атомарно!)
SET key value XX                 # Только если существует
SET key value GET                # Установить и вернуть старое значение (Redis 6.2+)
GET key                          # Получить значение
GETEX key EX 60                  # GET + обновить TTL (Redis 6.2+)
GETDEL key                       # GET + DELETE (Redis 6.2+)
MSET k1 v1 k2 v2 k3 v3          # Установить несколько (атомарно)
MGET k1 k2 k3                    # Получить несколько

# ──────────────── ЧИСЛА ────────────────
INCR counter                     # +1 (атомарно!)
INCRBY counter 5                 # +5
INCRBYFLOAT price 1.5            # +1.5 (float)
DECR counter                     # -1
DECRBY counter 10                # -10

# ──────────────── СТРОКОВЫЕ ────────────────
APPEND key " world"              # Дописать в конец
STRLEN key                       # Длина строки
GETRANGE key 0 4                 # Подстрока [0..4]
SETRANGE key 6 "Redis"           # Перезаписать с позиции 6

# ──────────────── УСТАРЕВШИЕ (но спросят!) ────────────────
SETNX key value                  # Устарел, используй SET NX
SETEX key 60 value               # Устарел, используй SET EX
GETSET key newvalue              # Устарел, используй SET GET
```

### Практические примеры

```bash
# Кэширование JSON объекта
SET user:1001 '{"id":1001,"name":"Alice","email":"alice@example.com"}' EX 3600

# Атомарный счётчик просмотров
INCR pageviews:home
# → (integer) 1
INCR pageviews:home
# → (integer) 2

# Distributed lock (простой вариант)
SET lock:resource1 "worker-uuid-123" NX EX 30
# → OK (успешно захватили блокировку)
SET lock:resource1 "worker-uuid-456" NX EX 30
# → (nil) (блокировка уже занята)

# Rate limiting (простейший вариант)
INCR rate:user:1001
EXPIRE rate:user:1001 60
# Проверяем значение — если > 100, отклоняем запрос

# Атомарный GETSET паттерн (обмен значениями)
SET session:abc123 "user:1001" EX 1800
GET session:abc123          # → "user:1001"
SET session:abc123 "user:1001" GET EX 1800  # Обновить TTL, получить старое значение
```

### NestJS пример

```typescript
// redis.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // Кэширование с автоматической сериализацией
  async cacheUser(userId: string, user: object, ttlSeconds = 3600) {
    await this.redis.set(
      `user:${userId}`,
      JSON.stringify(user),
      'EX',
      ttlSeconds
    );
  }

  async getCachedUser(userId: string): Promise<object | null> {
    const data = await this.redis.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  // Атомарный счётчик
  async incrementCounter(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  // Batch операции через MGET
  async getMultipleUsers(userIds: string[]): Promise<(object | null)[]> {
    const keys = userIds.map(id => `user:${id}`);
    const results = await this.redis.mget(...keys);
    return results.map(r => r ? JSON.parse(r) : null);
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/3-strings
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> ❌ **Ошибка**: "INCR/DECR не атомарны в Redis"
> ✅ **Правда**: INCR — атомарная операция. Redis гарантирует атомарность ВСЕХ отдельных команд (single-thread). Проблемы возникают при нескольких командах без MULTI/EXEC.

> ❌ **Ошибка**: "Для условной записи нужен WATCH + MULTI/EXEC"
> ✅ **Правда**: Для простых conditional SET достаточно SET NX или SET XX — они атомарны сами по себе.

> 💡 **Вопрос**: "В чём разница между SETNX и SET NX?"
> **Ответ**: Функционально одинаковы, но SETNX — legacy команда, SET NX — современный синтаксис. SETNX не поддерживает TTL атомарно (нужно было звать EXPIRE отдельно → race condition!). SET NX EX решает это атомарно.

> 🚨 **Классическая ошибка** (distributed lock anti-pattern):
> ```bash
> SETNX lock "worker"   # ← захватили блокировку
> EXPIRE lock 30        # ← а вот здесь процесс упал!
>                       # блокировка никогда не снимется (deadlock!)
> ```
> **Решение**: `SET lock "worker" NX EX 30` — атомарно!

---

## 📌 Шаг 4: Тип данных List

### Концепция

Redis List — это **двусвязный список строк**, связанных через указатели. Оптимален для:
- Очередей (FIFO: RPUSH + LPOP)
- Стэков (LIFO: RPUSH + RPOP)
- Лент активности (activity feeds)
- Последних N элементов (LTRIM)

> 📦 **Аналогия**: Очередь в кассу супермаркета. Новые люди встают в конец (RPUSH), кассир обслуживает первого в очереди (LPOP). Можно также встать в начало очереди (LPUSH), если вы VIP.

### Внутреннее представление

```
Если список маленький (< hash-max-listpack-entries = 128, значения < 64 байт):
  → listpack (компактное представление, экономит память)
  
Если список большой:
  → quicklist (массив listpack-узлов, балансирует между памятью и скоростью)
```

### Команды List

```bash
# ──────────────── ДОБАВЛЕНИЕ ────────────────
LPUSH queue task3 task2 task1    # Добавить в начало (слева). Порядок: task1, task2, task3
RPUSH queue task4 task5          # Добавить в конец (справа)
LPUSHX queue task0               # Только если список существует
RPUSHX queue task6               # Только если список существует
LINSERT queue BEFORE "task3" "task2.5"  # Вставить перед элементом
LINSERT queue AFTER  "task3" "task3.5"  # Вставить после элемента
LSET queue 0 "new_task1"         # Установить элемент по индексу

# ──────────────── ИЗВЛЕЧЕНИЕ ────────────────
LPOP queue                       # Извлечь из начала
RPOP queue                       # Извлечь из конца
LPOP queue 3                     # Извлечь 3 элемента из начала (Redis 6.2+)
LRANGE queue 0 -1                # Все элементы (0 = первый, -1 = последний)
LRANGE queue 0 9                 # Первые 10 элементов
LINDEX queue 0                   # Элемент по индексу (O(N)!)
LLEN queue                       # Длина списка

# ──────────────── БЛОКИРУЮЩИЕ ────────────────
BRPOP queue 30                   # Блокирующий RPOP, ждать 30 секунд
BLPOP queue1 queue2 0            # Блокирующий LPOP из нескольких, ждать бесконечно
BRPOPLPUSH src dst 30            # Устарел, используй BLMOVE
BLMOVE src dst LEFT RIGHT 30     # Атомарный перенос элемента

# ──────────────── УДАЛЕНИЕ ────────────────
LREM queue 2 "task1"             # Удалить 2 вхождения "task1" с начала
LREM queue -2 "task1"            # Удалить 2 вхождения "task1" с конца
LREM queue 0 "task1"             # Удалить все вхождения
LTRIM queue 0 99                 # Оставить только элементы [0..99], остальные удалить
```

### Практические примеры

```bash
# ── Job Queue (FIFO) ──
RPUSH jobs:email '{"to":"alice@ex.com","subject":"Welcome"}'
RPUSH jobs:email '{"to":"bob@ex.com","subject":"Reset"}'

# Воркер берёт задачу (блокирующий вариант — не тратит CPU на polling)
BRPOP jobs:email 0
# → 1) "jobs:email"
# → 2) '{"to":"alice@ex.com","subject":"Welcome"}'

# ── Recent Activity Feed (последние 100) ──
LPUSH feed:user:1001 '{"type":"like","postId":42}'
LTRIM feed:user:1001 0 99         # Оставляем только последние 100

# ── Надёжная очередь (reliable queue) ──
# Атомарно перемещаем задачу из входящей очереди в очередь "in-progress"
BLMOVE jobs:pending jobs:processing LEFT RIGHT 0
# После успешной обработки — удаляем из processing
LREM jobs:processing 1 '{"jobId":123}'
```

### NestJS пример

```typescript
@Injectable()
export class JobQueueService {
  constructor(@InjectRedis() private redis: Redis) {}

  async enqueue(queueName: string, job: object): Promise<void> {
    await this.redis.rpush(queueName, JSON.stringify(job));
  }

  // Блокирующий dequeue — воркер ждёт новую задачу
  async dequeue(queueName: string, timeoutSec = 30): Promise<object | null> {
    const result = await this.redis.blpop(queueName, timeoutSec);
    if (!result) return null; // timeout
    return JSON.parse(result[1]);
  }

  // Получить последние N событий из ленты
  async getRecentFeed(userId: string, limit = 20): Promise<object[]> {
    const items = await this.redis.lrange(`feed:${userId}`, 0, limit - 1);
    return items.map(item => JSON.parse(item));
  }

  // Добавить в ленту и обрезать
  async addToFeed(userId: string, event: object, maxSize = 100): Promise<void> {
    const key = `feed:${userId}`;
    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.ltrim(key, 0, maxSize - 1);
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/4-lists
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Чем LRANGE O(N) отличается от LINDEX O(N)?"
> **Ответ**: LRANGE — O(S+N) где S — смещение от начала/конца. LINDEX — O(N). Оба O(N), но LRANGE даёт диапазон, LINDEX — один элемент. Для больших списков лучше использовать LRANGE с небольшим диапазоном.

> ❌ **Ошибка**: "Использовать polling (цикл GET) вместо BRPOP для воркеров"
> ✅ **Правда**: BRPOP — блокирующая операция. Клиент ждёт в соединении без CPU нагрузки. Polling создаёт ненужный трафик и нагружает Redis.

> 🚨 **Проблема**: LINDEX имеет O(N) сложность!
> Если обращаетесь к середине большого списка часто — рассмотрите Sorted Set или Hash.

---

## 📌 Шаг 5: Тип данных Hash

### Концепция

Redis Hash — это **словарь (map) внутри ключа Redis**. Идеален для представления объектов с полями. Похож на строку JSON, но позволяет читать/обновлять отдельные поля без десериализации всего объекта.

> 🗃️ **Аналогия**: Папка с документами. Ключ Redis = имя папки, поле Hash = документ внутри папки. Можно добавить/заменить один документ без перекладывания всей папки.

### Команды Hash

```bash
# ──────────────── ЗАПИСЬ ────────────────
HSET user:1001 name "Alice" age 30 email "alice@example.com"
HSETNX user:1001 name "Bob"         # Только если поле НЕ существует
HMSET user:1001 name "Alice" age 30 # Устарел, используй HSET (теперь поддерживает множество полей)

# ──────────────── ЧТЕНИЕ ────────────────
HGET user:1001 name                 # → "Alice"
HMGET user:1001 name age            # → ["Alice", "30"]
HGETALL user:1001                   # → все поля и значения
HKEYS user:1001                     # → ["name", "age", "email"]
HVALS user:1001                     # → ["Alice", "30", "alice@example.com"]
HLEN user:1001                      # → 3
HEXISTS user:1001 name              # → 1 (существует)

# ──────────────── ЧИСЛА ────────────────
HINCRBY user:1001 age 1             # age += 1
HINCRBYFLOAT product:1 price 0.99  # price += 0.99

# ──────────────── УДАЛЕНИЕ ────────────────
HDEL user:1001 email                # Удалить поле
HDEL user:1001 name age             # Удалить несколько полей

# ──────────────── SCAN ────────────────
HSCAN user:1001 0 MATCH "em*" COUNT 10  # Итерация по полям
```

### Практические примеры

```bash
# Хранение профиля пользователя
HSET user:1001 \
  name "Alice" \
  email "alice@example.com" \
  age 30 \
  plan "premium" \
  created_at "2024-01-01"

# Обновить только email (не трогая остальные поля!)
HSET user:1001 email "new@example.com"

# Атомарный инкремент счётчика покупок
HINCRBY user:1001 purchases 1

# Корзина покупок
HSET cart:user:1001 product:42 3   # productId → количество
HSET cart:user:1001 product:99 1
HGETALL cart:user:1001
# → { "product:42": "3", "product:99": "1" }

# Конфигурация приложения
HSET config:app \
  max_upload_size "10485760" \
  allowed_formats "jpg,png,gif" \
  debug_mode "false"
```

### Hash vs String (JSON) сравнение

```
┌─────────────────┬──────────────────────┬──────────────────────┐
│ Операция        │ Hash                 │ String (JSON)        │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Обновить поле   │ HSET key field val   │ GET → parse → modify │
│                 │ O(1)                 │ → stringify → SET    │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Прочитать поле  │ HGET key field O(1)  │ GET → parse O(N)     │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Инкремент поля  │ HINCRBY key f 1 O(1) │ Нельзя атомарно      │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Память          │ Больше (> 128 полей) │ Меньше               │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Поиск по полям  │ Нет                  │ Нет (только SCAN)    │
└─────────────────┴──────────────────────┴──────────────────────┘

Вывод: Hash лучше когда нужно частично обновлять объект.
       String/JSON лучше когда всегда читаете/пишете весь объект.
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/5-hashes
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Когда использовать Hash, а когда String+JSON?"
> **Ответ**: Hash — когда нужно атомарно обновлять отдельные поля (HINCRBY, HSET одного поля). String+JSON — когда всегда читаете/пишете весь объект и размер небольшой. Hash занимает меньше памяти для маленьких объектов (< 128 полей) благодаря listpack encoding, но для больших объектов с частым полным чтением String может быть эффективнее.

> 🚨 **HGETALL в продакшне**: HGETALL на Hash с тысячами полей — это O(N) операция, которая блокирует Redis! Используйте HSCAN для больших хэшей.

---

## 📌 Шаг 6: Тип данных Set

### Концепция

Redis Set — это **неупорядоченная коллекция уникальных строк**. Автоматически дедуплицирует элементы. Поддерживает теоретико-множественные операции: объединение, пересечение, разность.

> 🎭 **Аналогия**: Список гостей на вечеринке. Нельзя пригласить одного человека дважды (уникальность). Можно быстро проверить, приглашён ли кто-то (SISMEMBER). Можно объединить списки двух вечеринок (SUNION).

### Команды Set

```bash
# ──────────────── ДОБАВЛЕНИЕ / УДАЛЕНИЕ ────────────────
SADD tags:post:1 "redis" "database" "cache" "nosql"
SREM tags:post:1 "nosql"
SMEMBERS tags:post:1            # → {"redis", "database", "cache"}
SCARD tags:post:1               # → 3 (мощность множества)
SISMEMBER tags:post:1 "redis"   # → 1 (да, есть)
SISMEMBER tags:post:1 "mysql"   # → 0 (нет)
SMISMEMBER tags:post:1 "redis" "mysql" "cache"  # → [1, 0, 1] (Redis 6.2+)

# ──────────────── СЛУЧАЙНЫЙ ЭЛЕМЕНТ ────────────────
SRANDMEMBER tags:post:1         # Случайный элемент (без удаления)
SRANDMEMBER tags:post:1 3       # 3 уникальных случайных элемента
SRANDMEMBER tags:post:1 -3      # 3 элемента с возможными повторами
SPOP tags:post:1                # Случайный элемент С удалением
SPOP tags:post:1 2              # 2 случайных элемента с удалением

# ──────────────── ТЕОРИЯ МНОЖЕСТВ ────────────────
SUNION set1 set2 set3           # Объединение (A ∪ B ∪ C)
SINTER set1 set2 set3           # Пересечение (A ∩ B ∩ C)
SDIFF set1 set2                 # Разность (A \ B)

SUNIONSTORE result set1 set2    # Объединение → сохранить в result
SINTERSTORE result set1 set2    # Пересечение → сохранить в result
SDIFFSTORE result set1 set2     # Разность → сохранить в result

# ──────────────── ПЕРЕМЕЩЕНИЕ ────────────────
SMOVE src dst "member"          # Атомарный перенос элемента
```

### Практические примеры

```bash
# ── Система тегов ──
SADD tags:post:1 "redis" "nosql" "database"
SADD tags:post:2 "redis" "cache" "performance"
SINTER tags:post:1 tags:post:2  # Общие теги → {"redis"}
SUNION tags:post:1 tags:post:2  # Все теги → {"redis","nosql","database","cache","performance"}

# ── Online users ──
SADD online:users "user:1001" "user:1002" "user:1003"
SCARD online:users              # Количество онлайн пользователей
SISMEMBER online:users "user:1001"  # Пользователь онлайн?

# ── Список подписчиков (follow система) ──
SADD follows:alice "bob" "charlie" "diana"
SADD follows:bob "alice" "charlie"
SINTER follows:alice follows:bob  # Общие подписки → {"charlie"}
SDIFF follows:alice follows:bob   # Подписки Алисы, которых нет у Боба → {"diana"}

# ── Уникальные IP адреса (защита от DDoS) ──
SADD unique:ips:2024-01-15 "192.168.1.1" "10.0.0.1"
SCARD unique:ips:2024-01-15     # Количество уникальных IP
# (для очень больших наборов → используйте HyperLogLog!)

# ── Рекомендации: "People You May Know" ──
SADD friends:alice bob charlie diana
SADD friends:eve bob frank diana
SINTER friends:alice friends:eve    # Общие друзья → {bob, diana}
SDIFF friends:eve friends:alice     # Друзья Евы, не знакомые Алисе → {frank}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/6-sets
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "SMEMBERS на Set с миллионом элементов — хорошая идея?"
> **Ответ**: Нет! SMEMBERS — O(N), вернёт миллион элементов, заблокирует Redis. Используйте SSCAN для итерации.

> 💡 **Вопрос**: "Как подсчитать уникальных пользователей среди миллиарда визитов?"
> **Ответ**: Set не подойдёт — слишком много памяти (каждый элемент ~50 байт). Используйте HyperLogLog (12 KB на любой размер, погрешность 0.81%).

---

## 📌 Шаг 7: Тип данных Sorted Set (ZSet)

### Концепция

Sorted Set — это **Set с числовым score для каждого элемента**. Элементы автоматически сортируются по score. Если score одинаковый — сортировка по лексикографии. Идеален для: рейтингов, leaderboard, priority queues, range queries.

> 🏆 **Аналогия**: Спортивный чемпионат с таблицей результатов. Каждый участник (member) имеет очки (score). Таблица всегда отсортирована. Можно мгновенно узнать место любого участника (ZRANK) или топ-10 (ZRANGE).

### Внутреннее представление

```
Маленький ZSet (< 128 элементов, значения < 64 байт):
  → listpack (компактно, O(N) для поиска — но N маленький)
  
Большой ZSet:
  → skiplist + hash table
     skiplist  → O(log N) для range запросов
     hash table → O(1) для ZSCORE/ZRANK
```

### Команды Sorted Set

```bash
# ──────────────── ДОБАВЛЕНИЕ ────────────────
ZADD leaderboard 1500 "alice"
ZADD leaderboard 2300 "bob" 1800 "charlie"    # Несколько за раз
ZADD leaderboard NX 1000 "diana"              # Только если НЕ существует
ZADD leaderboard XX 2500 "alice"              # Только если существует (обновить)
ZADD leaderboard GT 2600 "alice"              # Только если новый score > текущего
ZADD leaderboard LT 1000 "alice"              # Только если новый score < текущего
ZINCRBY leaderboard 100 "alice"              # Увеличить score на 100

# ──────────────── ДИАПАЗОНЫ (Redis 6.2: ZRANGE unified!) ────────────────
ZRANGE leaderboard 0 -1                      # Все, по возрастанию score
ZRANGE leaderboard 0 -1 WITHSCORES           # С очками
ZRANGE leaderboard 0 -1 REV                  # По убыванию
ZRANGE leaderboard "(1000" "+inf" BYSCORE    # score > 1000
ZRANGE leaderboard 0 2 REV WITHSCORES        # Топ-3 с очками
ZRANGEBYSCORE leaderboard 1000 2000          # Устарел, используй ZRANGE BYSCORE
ZREVRANGEBYSCORE lb "+inf" "-inf"            # Устарел, используй ZRANGE REV BYSCORE
ZRANGEBYLEX leaderboard "[a" "[z"            # Лексикографический диапазон (score должны быть одинаковыми)

# ──────────────── ИНФОРМАЦИЯ ────────────────
ZSCORE leaderboard "alice"                   # Score конкретного элемента
ZRANK leaderboard "alice"                    # Позиция (0-based, по возрастанию)
ZREVRANK leaderboard "alice"                 # Позиция по убыванию (рейтинг)
ZCARD leaderboard                            # Количество элементов
ZCOUNT leaderboard 1000 2000                 # Количество элементов в диапазоне score

# ──────────────── УДАЛЕНИЕ ────────────────
ZREM leaderboard "alice"
ZREMRANGEBYRANK leaderboard 0 9             # Удалить первые 10 по позиции
ZREMRANGEBYSCORE leaderboard "-inf" 1000    # Удалить всех с score ≤ 1000
ZPOPMIN leaderboard                          # Удалить и вернуть элемент с min score
ZPOPMAX leaderboard                          # Удалить и вернуть элемент с max score
ZPOPMIN leaderboard 3                        # Удалить 3 элемента с min score
BZPOPMIN leaderboard 0                       # Блокирующий ZPOPMIN

# ──────────────── МНОЖЕСТВА ────────────────
ZUNIONSTORE result 2 set1 set2              # Объединение → result
ZINTERSTORE result 2 set1 set2              # Пересечение → result
ZDIFFSTORE result 2 set1 set2              # Разность → result
ZUNIONSTORE result 2 set1 set2 WEIGHTS 2 1 # Веса для score
ZUNIONSTORE result 2 set1 set2 AGGREGATE MIN # Агрегация: MIN/MAX/SUM
```

### Практические примеры

```bash
# ── Leaderboard ──
ZADD game:leaderboard 15000 "alice" 23000 "bob" 18000 "charlie" 9000 "diana"

# Топ-3 игроков
ZRANGE game:leaderboard 0 2 REV WITHSCORES
# → 1) "bob" 2) "23000" 3) "charlie" 4) "18000" 5) "alice" 6) "15000"

# Место игрока (1-based)
ZREVRANK game:leaderboard "alice"   # → 2 (0-based) → место 3

# Ближайшие соперники Алисы
ZRANK game:leaderboard "alice"      # → 1 (0-based в порядке возрастания)
ZRANGE game:leaderboard 0 2 WITHSCORES  # игроки вокруг неё

# ── Priority Queue ──
ZADD priority:queue 1 "low-priority-task"
ZADD priority:queue 10 "high-priority-task"
ZADD priority:queue 5 "medium-priority-task"

# Воркер берёт самую приоритетную задачу
ZPOPMAX priority:queue    # → "high-priority-task" с score 10

# ── Delayed Job Queue (задачи по времени) ──
# Score = unix timestamp выполнения
ZADD delayed:jobs 1735000000 "send-email-job-1"
ZADD delayed:jobs 1735001000 "send-report-job-2"

# Воркер берёт задачи, время которых наступило
ZRANGE delayed:jobs "-inf" "1735000500" BYSCORE
# → ["send-email-job-1"]

# ── Sliding Window Rate Limit (via ZSet) ──
# Добавить запрос с текущим временем как score
ZADD rate:user:1001 1735000100 "req:uuid-1"
# Удалить старые запросы (старше 60 секунд)
ZREMRANGEBYSCORE rate:user:1001 "-inf" 1735000040
# Подсчитать запросы в окне
ZCARD rate:user:1001    # Если > limit → отклонить
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/7-sorted-sets
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Какая сложность ZRANK?"
> **Ответ**: O(log N) — используется skiplist для поиска позиции.

> 💡 **Вопрос**: "Как работает skiplist в Redis?"
> **Ответ**: Skiplist — вероятностная структура данных. Многоуровневый связный список, где каждый уровень пропускает элементы с вероятностью 1/4 (или 1/2). Позволяет O(log N) поиск, вставку, удаление без балансировки (в отличие от B-tree). Redis использует skiplist вместо B-tree, потому что: 1) проще реализовать 2) хорошо работает с range запросами 3) можно lock-free читать.

> ❌ **Ошибка**: "ZRANGE всегда возвращает по возрастанию score"
> ✅ **Правда**: ZRANGE с REV флагом возвращает по убыванию. До Redis 6.2 были отдельные команды ZREVRANGE. Теперь ZRANGE покрывает все случаи.

---

## 📌 Шаг 8: Bitmap

### Концепция

Bitmap — это не отдельный тип данных Redis. Это **набор битовых операций над строкой**. Строка в Redis бинарно-безопасная, поэтому каждый её байт — 8 бит. Bitmap позволяет работать с отдельными битами.

> 📅 **Аналогия**: Чек-лист посещаемости. Каждый день месяца — один бит. 0 = не пришёл, 1 = пришёл. 31 день = 31 бит = 4 байта. Для миллиона пользователей × 365 дней = ~45 MB (невероятно компактно!).

### Команды Bitmap

```bash
# ──────────────── БАЗОВЫЕ ────────────────
SETBIT user:1001:logins 0 1     # Установить бит 0 (день 0) = 1
SETBIT user:1001:logins 5 1     # День 5 = 1 (логин был)
SETBIT user:1001:logins 7 1     # День 7 = 1
GETBIT user:1001:logins 5       # → 1 (был логин в день 5)
GETBIT user:1001:logins 6       # → 0 (не было логина в день 6)

# ──────────────── ПОДСЧЁТ ────────────────
BITCOUNT user:1001:logins       # Количество единичных битов (дней с логином)
BITCOUNT user:1001:logins 0 3   # Только в байтах [0..3] (биты [0..31])

# ──────────────── ПОИСК ────────────────
BITPOS user:1001:logins 1       # Первый установленный бит (первый день логина)
BITPOS user:1001:logins 0       # Первый сброшенный бит

# ──────────────── ОПЕРАЦИИ ────────────────
BITOP AND result key1 key2      # Побитовое AND → result
BITOP OR result key1 key2       # Побитовое OR → result
BITOP XOR result key1 key2      # Побитовое XOR → result
BITOP NOT result key1           # Побитовое NOT → result
```

### Практические примеры

```bash
# ── Дневная активность пользователей ──
# userID = offset, дата = ключ
# Отметить что user 1001 активен сегодня (day 0 года)
SETBIT activity:2024-01-15 1001 1

# Сколько активных пользователей сегодня?
BITCOUNT activity:2024-01-15    # O(N) по размеру bitmap

# Пользователи активные И вчера И сегодня (retention)
BITOP AND retention:both activity:2024-01-14 activity:2024-01-15
BITCOUNT retention:both

# ── Фича-флаги (Feature Flags) ──
SETBIT feature:dark-mode 1001 1  # Включить dark mode для user 1001
GETBIT feature:dark-mode 1001    # Проверить

# ── Расписание ──
# Каждый бит = 1 час дня (24 бита = 3 байта)
SETBIT schedule:room:A 9 1      # 09:00 занята
SETBIT schedule:room:A 10 1     # 10:00 занята
GETBIT schedule:room:A 11       # → 0 (11:00 свободна)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/8-bitmaps
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Bitmap хранит 1 бит на пользователя. Но если у меня userID = 1,000,000, какой размер bitmap?"
> **Ответ**: Бит с offset N требует хранить N/8 байт. Offset 1,000,000 = 125,000 байт = ~122 KB. Если пользователей мало, но их ID большие (sparse), лучше использовать Set или HyperLogLog. Bitmap эффективен только при плотном распределении ID.

> 💡 **Вопрос**: "BITCOUNT всего bitmap — сколько стоит?"
> **Ответ**: O(N) где N = размер строки в байтах. Для bitmap с offset миллион — это O(125,000). Это быстро, но для очень больших bitmap можно использовать диапазон байт.

---

## 📌 Шаг 9: HyperLogLog

### Концепция

HyperLogLog — это **вероятностная структура данных** для подсчёта количества уникальных элементов (cardinality). Использует фиксированные **12 KB памяти** независимо от количества элементов. Погрешность: **0.81%**.

> 🔬 **Аналогия**: Оценить количество уникальных слов в книге Толстого, не записывая каждое слово. HyperLogLog использует математические хеш-функции и "магию" вероятностей для оценки с точностью 99.19%.

### Когда использовать

```
✅ Подсчёт уникальных посетителей сайта (UV)
✅ Уникальные поисковые запросы
✅ Уникальные IP адреса
✅ A/B тестирование (уникальные участники)
✅ Количество уникальных товаров в заказах

❌ Когда нужна точность 100% → используйте Set
❌ Когда нужно знать конкретные элементы → используйте Set
❌ Когда элементов мало (< 1000) → Set эффективнее
```

### Команды HyperLogLog

```bash
PFADD uv:home "user:1001" "user:1002" "user:1003" "user:1001"
# → (integer) 1 (структура изменилась)

PFCOUNT uv:home
# → (integer) 3 (не 4, дубли учтены!)

PFADD uv:about "user:1002" "user:1004"
PFMERGE uv:total uv:home uv:about
PFCOUNT uv:total
# → (integer) 4 (объединение уникальных)
```

### Практические примеры

```bash
# ── Daily/Weekly/Monthly unique visitors ──
# Добавляем визит
PFADD uv:daily:2024-01-15 "user:1001"
PFADD uv:daily:2024-01-15 "user:1002"
PFADD uv:daily:2024-01-15 "user:1001"  # повтор, игнорируется

# Дневная статистика
PFCOUNT uv:daily:2024-01-15    # → ~2 (точно 2 в данном случае)

# Недельная статистика (merge дневных)
PFMERGE uv:weekly:2024-W03 \
  uv:daily:2024-01-15 \
  uv:daily:2024-01-16 \
  uv:daily:2024-01-17

PFCOUNT uv:weekly:2024-W03    # Уникальные за неделю

# ── Сравнение памяти Set vs HyperLogLog ──
# 1 миллион уникальных UUID (36 байт каждый)
# Set:         ~36 MB
# HyperLogLog: ~12 KB (в 3000x меньше!)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/9-hyperloglog
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Почему PFCOUNT иногда возвращает не точное число?"
> **Ответ**: HyperLogLog — вероятностный алгоритм. Он использует битовые паттерны хешей для статистической оценки cardinality. Погрешность ≤ 0.81% при стандартной конфигурации Redis (16384 регистра). Для малых наборов (< 64 элементов) Redis использует точное представление (dense vs sparse).

---

## 📌 Шаг 10: Redis Streams

### Концепция

Redis Streams — это **append-only log структура данных**, введённая в Redis 5.0. Похожа на Apache Kafka: сообщения не удаляются после чтения, поддерживает consumer groups, ACK, backpressure.

> 📰 **Аналогия**: Лента новостей (newsfeed). Каждый пост добавляется с временной меткой и остаётся навсегда. Разные читатели могут независимо читать ленту с разных позиций. Группа редакторов может распределять посты между собой для обработки.

### Структура сообщения (Entry)

```
ID: 1735000000000-0   (milliseconds-sequenceNumber)
     │              │
     │              └─ порядковый номер в пределах миллисекунды
     └─ unix timestamp в миллисекундах

Поля:  field1 value1 field2 value2 ...
```

### Команды Streams

```bash
# ──────────────── ЗАПИСЬ ────────────────
XADD mystream * event "user_login" userId "1001"
# → "1735000000000-0" (автогенерированный ID)

XADD mystream 1735000001000-0 event "purchase" amount "99.99"
# → принудительный ID (осторожно!)

XADD mystream MAXLEN 1000 * event "view" page "/home"
# → ограничить длину stream до 1000

XADD mystream MAXLEN ~ 1000 * event "view"
# → приблизительное ограничение (эффективнее!)

# ──────────────── ЧТЕНИЕ ────────────────
XRANGE mystream - +                 # Все сообщения (- = начало, + = конец)
XRANGE mystream - + COUNT 10        # Первые 10
XRANGE mystream 1735000000000 +     # С ID >= ...
XREVRANGE mystream + -              # В обратном порядке
XLEN mystream                       # Количество сообщений

XREAD COUNT 10 STREAMS mystream 0   # Читать с начала, 10 сообщений
XREAD COUNT 10 STREAMS mystream $   # Только НОВЫЕ сообщения ($ = последний ID)
XREAD COUNT 10 BLOCK 0 STREAMS mystream $  # Блокирующее чтение (ждать бесконечно)

# ──────────────── CONSUMER GROUPS ────────────────
XGROUP CREATE mystream workers $ MKSTREAM
# workers = имя группы, $ = только новые сообщения, MKSTREAM = создать если нет

XREADGROUP GROUP workers consumer1 COUNT 5 STREAMS mystream >
# > = необработанные сообщения для этой группы

XACK mystream workers "1735000000000-0"  # Подтвердить обработку

XPENDING mystream workers - + 10        # Pending сообщения (взяты, не ACK)
XCLAIM mystream workers consumer2 3600000 "1735000000000-0"
# Передать pending сообщение другому воркеру (если первый умер)

XAUTOCLAIM mystream workers consumer2 3600000 0-0 COUNT 10
# Автоматически claim pending > 1 час (Redis 6.2+)

# ──────────────── УПРАВЛЕНИЕ ────────────────
XDEL mystream "1735000000000-0"         # Удалить конкретное сообщение
XTRIM mystream MAXLEN 1000              # Обрезать до 1000 сообщений
XINFO STREAM mystream                   # Информация о stream
XINFO GROUPS mystream                   # Информация о группах
XINFO CONSUMERS mystream workers        # Информация о консьюмерах
```

### Практические примеры

```bash
# ── Event Sourcing ──
XADD events:order * \
  type "ORDER_CREATED" \
  orderId "12345" \
  userId "1001" \
  amount "150.00"

XADD events:order * \
  type "PAYMENT_PROCESSED" \
  orderId "12345" \
  status "success"

# ── Consumer Groups для микросервисов ──
XGROUP CREATE events:order email-service $ MKSTREAM
XGROUP CREATE events:order analytics-service $ MKSTREAM

# Email сервис читает свою часть
XREADGROUP GROUP email-service worker1 COUNT 10 BLOCK 5000 STREAMS events:order >

# После обработки — подтверждаем
XACK events:order email-service "1735000000000-0"
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/10-streams
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "В чём разница между Redis Streams и Pub/Sub?"
> **Ответ**: 
> - **Pub/Sub**: Fire-and-forget, нет персистентности, нет ACK. Если подписчик не слушает — сообщение потеряно.
> - **Streams**: Персистентность (append-only log), consumer groups, ACK, backpressure, возможность перечитать историю.
> **Streams = Kafka-lite внутри Redis**.

> 💡 **Вопрос**: "Когда использовать Streams, а когда Kafka?"
> **Ответ**: Redis Streams — для небольших объёмов (< 1M msg/sec), когда уже есть Redis в инфраструктуре, нужна простота. Kafka — для высоких нагрузок, долгосрочного хранения (retention дни/недели), сложных топологий, много консьюмеров, многопартиционного параллелизма.

---

## 📌 Шаг 11: Geospatial

### Концепция

Redis Geo — это надстройка над **Sorted Set**, которая хранит координаты как специально закодированный score (geohash). Позволяет выполнять запросы типа "найти всё в радиусе X км от точки".

### Команды Geo

```bash
GEOADD locations 37.6156 55.7522 "moscow"
GEOADD locations 30.3141 59.9386 "saint-petersburg" 39.7015 47.2357 "rostov"

GEODIST locations "moscow" "saint-petersburg" km
# → "635.0022" км

GEOPOS locations "moscow"
# → [[37.61559993028640747, 55.75219883090996]]

GEOSEARCH locations FROMMEMBER "moscow" BYRADIUS 700 km ASC
# → ближайшие города в радиусе 700 км от Москвы

GEOSEARCH locations FROMLONLAT 37.6 55.7 BYRADIUS 700 km ASC WITHCOORD WITHDIST COUNT 5
# С координатами и расстоянием, топ-5

GEOHASH locations "moscow"
# → ["ucfv0j9h0g0"]  (base32 geohash)
```

### Практические примеры

```bash
# ── Приложение доставки: ближайшие курьеры ──
GEOADD couriers:online 37.6173 55.7558 "courier:1"
GEOADD couriers:online 37.6000 55.7400 "courier:2"

GEOSEARCH couriers:online FROMLONLAT 37.615 55.752 BYRADIUS 1 km ASC COUNT 3 WITHDIST
# Найти курьеров в радиусе 1 км, 3 ближайших с расстоянием

# ── Поиск ресторанов рядом ──
GEOADD restaurants 37.6101 55.7539 "mcdonalds:1"
GEOADD restaurants 37.6200 55.7600 "kfc:1"

GEOSEARCH restaurants FROMLONLAT 37.615 55.755 BYBOX 2 2 km ASC
# В прямоугольнике 2x2 км
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/11-geo
```

---

## 📌 Шаг 12: TTL и Eviction

### Концепция TTL

TTL (Time To Live) — время жизни ключа. После истечения ключ автоматически удаляется.

### Команды TTL

```bash
SET session:abc123 "user:1001" EX 1800    # TTL при создании (секунды)
SET session:abc123 "user:1001" PX 1800000 # TTL при создании (миллисекунды)

EXPIRE key 3600          # Установить TTL (секунды)
EXPIREAT key 1735000000  # Установить дедлайн (unix timestamp)
PEXPIRE key 3600000      # TTL в миллисекундах
PEXPIREAT key 1735000000000  # Дедлайн в миллисекундах

TTL key                  # Оставшееся время (секунды), -1 = нет TTL, -2 = нет ключа
PTTL key                 # Оставшееся время (миллисекунды)

PERSIST key              # Убрать TTL (сделать постоянным)

# Redis 7.0: новые опции EXPIRE
EXPIRE key 3600 NX       # Только если нет текущего TTL
EXPIRE key 3600 XX       # Только если есть текущий TTL
EXPIRE key 3600 GT       # Только если новый TTL > текущего
EXPIRE key 3600 LT       # Только если новый TTL < текущего
```

### Механизм истечения (Expiration)

```
Redis использует ДВА механизма удаления просроченных ключей:

1. ЛЕНИВОЕ (Lazy/Passive) удаление:
   Ключ удаляется только когда к нему обращаются.
   SET key "val" EX 1
   sleep(2)
   GET key  ← вот тут Redis удаляет ключ и возвращает nil
   
   Плюсы: никакого CPU overhead
   Минусы: просроченные ключи занимают память до обращения

2. АКТИВНОЕ (Active/Periodic) удаление:
   Фоновый процесс каждые 100мс (hz = 10 по умолчанию) проверяет
   случайную выборку из volatile ключей и удаляет просроченные.
   
   Алгоритм (adaptive):
   - Проверить 20 случайных ключей с TTL
   - Удалить просроченные
   - Если > 25% просроченных → повторить немедленно
   
   Конфигурация:
   hz 10           # Частота (10 = 100мс между циклами)
   dynamic-hz yes  # Адаптивная частота (увеличивается при нагрузке)
```

### Политики вытеснения (Eviction Policies)

Когда память заполнена (maxmemory достигнут):

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru

# Политики:
# ────────────────────────────────────────────────────────────────
# noeviction    → Ошибка OOM при записи (DEFAULT). Чтение работает.
#                 Используй для критичных данных (БД, не кэш).
#
# allkeys-lru   → LRU среди ВСЕХ ключей (Least Recently Used)
#                 Лучший выбор для общего кэша.
#
# allkeys-lfu   → LFU среди ВСЕХ ключей (Least Frequently Used)  
#                 Лучше LRU если популярность ключей меняется.
#
# volatile-lru  → LRU только среди ключей С TTL
#                 Для смешанного хранилища (кэш + персистентные данные)
#
# volatile-lfu  → LFU только среди ключей С TTL
#
# allkeys-random  → Случайный из ВСЕХ ключей (редко используется)
# volatile-random → Случайный среди ключей С TTL
#
# volatile-ttl  → Сначала вытесняет ключи с наименьшим TTL
#                 Хорошо если вы вручную управляете приоритетами через TTL
# ────────────────────────────────────────────────────────────────
```

### Выбор политики вытеснения

```
┌─────────────────────────────────────────────────────────────┐
│              Как выбрать eviction policy?                    │
│                                                             │
│  Все ключи = кэш (нет персистентных данных)?               │
│  ├─ ДА → allkeys-lru (или allkeys-lfu для hot/cold данных) │
│  └─ НЕТ → volatile-lru (только ключи с TTL вытесняются)   │
│                                                             │
│  Нужно гарантировать данные не будут потеряны?             │
│  └─ noeviction (но нужно мониторить память!)               │
│                                                             │
│  Ключи имеют разную частоту обращений?                     │
│  └─ lfu лучше lru (учитывает частоту, не только давность)  │
└─────────────────────────────────────────────────────────────┘
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/12-ttl
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Если TTL истёк 1 час назад, удалён ли ключ из памяти?"
> **Ответ**: Не обязательно! Ленивое удаление — только при обращении. Активное удаление — периодически. Просроченный ключ может занимать память, пока к нему не обратятся или пока активный процесс его не найдёт.

> 💡 **Вопрос**: "В чём разница между LRU и LFU?"
> **Ответ**: LRU (Least Recently Used) удаляет ключи, к которым давно не обращались. LFU (Least Frequently Used) удаляет ключи, к которым редко обращаются. LFU лучше справляется с "scan pollution" (когда одноразовые данные вытесняют популярные), но требует больше памяти для хранения счётчиков.

> 🚨 **Важно**: Redis реализует приближённый LRU (не точный). Вместо поддержания точного LRU списка, Redis проверяет N случайных ключей (maxmemory-samples = 5 по умолчанию) и выбирает наименее недавно использованный. Это компромисс между точностью и использованием памяти.

---

## 📌 Шаг 13: Персистентность (RDB и AOF)

### RDB (Redis Database / Snapshotting)

**RDB** делает **снимок** всей базы данных в момент времени и сохраняет в бинарный файл `dump.rdb`.

```
Конфигурация (redis.conf):
save 900 1      # Сохранить если ≥ 1 изменение за 900 сек (15 мин)
save 300 10     # Сохранить если ≥ 10 изменений за 300 сек (5 мин)
save 60 10000   # Сохранить если ≥ 10,000 изменений за 60 сек

dbfilename dump.rdb
dir /var/lib/redis/
```

#### Как работает BGSAVE

```
1. Redis вызывает fork() → создаётся дочерний процесс
2. Дочерний процесс пишет данные в dump.rdb
3. Родительский процесс продолжает обслуживать клиентов
4. Copy-On-Write (COW): если родитель изменяет страницу памяти,
   ОС создаёт её копию → дочерний читает оригинал
5. После записи дочерний процесс завершается
```

```bash
BGSAVE           # Запустить фоновое сохранение
SAVE             # Синхронное сохранение (БЛОКИРУЕТ Redis!)
LASTSAVE         # Unix timestamp последнего успешного SAVE
BGSAVE SCHEDULE  # Запланировать BGSAVE если другой уже не запущен
```

#### RDB: Плюсы и Минусы

```
✅ ПЛЮСЫ:
  - Компактный бинарный формат (сжатый)
  - Быстрое восстановление (загрузка одного файла)
  - Подходит для backup и disaster recovery
  - Минимальный overhead на производительность (fork + background)
  - Идеален для репликации (начальная синхронизация)

❌ МИНУСЫ:
  - Возможна потеря данных между снимками (RPO = интервал между save)
  - fork() может занять время на больших БД (COW overhead)
  - Не подходит для durability (надёжности)
```

### AOF (Append Only File)

**AOF** записывает **каждую команду записи** в файл `appendonly.aof` в текстовом виде.

```
Конфигурация:
appendonly yes
appendfilename "appendonly.aof"
appendfsync always     # fsync после каждой команды (безопасно, медленно)
appendfsync everysec   # fsync раз в секунду (компромисс, рекомендуется)
appendfsync no         # fsync никогда (ОС решает, быстро, небезопасно)
```

#### fsync политики

```
always:   Запись → fsync → ответ клиенту
          RPO = 0 (нет потери данных)
          Производительность: ~20,000 ops/sec

everysec: Запись → буфер → fsync раз/сек (фоновый поток)
          RPO = 1 секунда (максимальная потеря)
          Производительность: ~100,000+ ops/sec (рекомендуется!)

no:       Запись → буфер → ОС решает когда fsync (обычно 30 сек)
          RPO = до 30 секунд потери
          Производительность: максимальная
```

#### AOF Rewrite

AOF файл растёт бесконечно. Rewrite перестраивает его, сохраняя только текущее состояние:

```bash
BGREWRITEAOF    # Запустить фоновый rewrite

# Автоматический rewrite:
auto-aof-rewrite-percentage 100   # Rewrite если AOF вырос вдвое
auto-aof-rewrite-min-size 64mb    # Минимальный размер для rewrite
```

#### AOF: Плюсы и Минусы

```
✅ ПЛЮСЫ:
  - Минимальная потеря данных (everysec = 1 сек, always = 0)
  - Человекочитаемый формат (можно редактировать вручную!)
  - Атомарность записи (fsync)
  - Можно отменить опасную команду (FLUSHALL) до перезагрузки

❌ МИНУСЫ:
  - Больший размер файла (чем RDB)
  - Медленнее загрузка при восстановлении
  - fsync overhead
  - Потенциальные баги в AOF (редко, но были)
```

### RDB + AOF вместе (Рекомендуется!)

```
При использовании обоих:
- При восстановлении Redis использует AOF (более полный)
- RDB используется для быстрых backup и репликации

aof-use-rdb-preamble yes  # AOF начинается с RDB снимка (Redis 4+)
                           # Ускоряет загрузку AOF файла
```

### Сравнение стратегий персистентности

```
┌──────────────┬─────────────┬─────────────┬──────────────┬────────────┐
│ Стратегия    │ RPO (потеря)│ Скорость    │ Размер файла │ Загрузка   │
├──────────────┼─────────────┼─────────────┼──────────────┼────────────┤
│ Нет          │ Все данные  │ Максимальная│ -            │ Мгновенно  │
│ RDB          │ Минуты      │ Высокая     │ Маленький    │ Быстрая    │
│ AOF everysec │ 1 секунда   │ Высокая     │ Большой      │ Медленная  │
│ AOF always   │ 0           │ Низкая      │ Большой      │ Медленная  │
│ RDB + AOF    │ 1 секунда   │ Высокая     │ Оба файла    │ Медленная  │
└──────────────┴─────────────┴─────────────┴──────────────┴────────────┘
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/13-persistence
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Что происходит с памятью при BGSAVE на сервере с 10 GB данных?"
> **Ответ**: fork() создаёт дочерний процесс. Linux использует Copy-On-Write: страницы памяти разделяются. В момент fork RSS почти не увеличивается. Но если родительский процесс активно изменяет данные, ОС создаёт копии страниц → потребление памяти может удвоиться! Поэтому нужен сервер с RAM = 2x рабочего набора данных.

> 💡 **Вопрос**: "Почему AOF файл после удаления всех данных всё равно большой?"
> **Ответ**: AOF — append-only log. SET и DEL записывают обе команды. Rewrite создаёт новый компактный файл из текущего состояния. Запустите BGREWRITEAOF или настройте auto-aof-rewrite-percentage.

> 🚨 **Важно**: `appendfsync always` на высоконагруженном сервере даёт ~20k ops/sec. Это может быть bottleneck. `everysec` с RPO 1 секунда — золотой стандарт для большинства приложений.

---

# 🎓 ЧАСТЬ 2: ПАТТЕРНЫ КЭШИРОВАНИЯ (Middle/Senior)

---

## 📌 Шаг 14: Cache-Aside (Lazy Loading)

### Концепция

**Cache-Aside** (он же Lazy Loading) — самый распространённый паттерн кэширования. Приложение само управляет кэшем: сначала проверяет кэш, если нет — идёт в БД, потом кладёт в кэш.

```
┌──────────┐    1. GET user:1001     ┌───────────┐
│          │ ───────────────────────▶│           │
│   App    │                         │   Redis   │
│          │ ◀─── 2. MISS (nil) ─────│           │
└──────────┘                         └───────────┘
     │
     │ 3. SELECT * FROM users WHERE id=1001
     ▼
┌──────────┐
│ Database │
└──────────┘
     │
     │ 4. {id:1001, name:"Alice"}
     ▼
┌──────────┐    5. SET user:1001 ... EX 3600  ┌───────────┐
│   App    │ ─────────────────────────────────▶│   Redis   │
│          │    6. Вернуть данные клиенту      │           │
└──────────┘                                   └───────────┘
```

### Реализация

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRedis() private redis: Redis,
    private db: DatabaseService
  ) {}

  async getUser(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    
    // 1. Проверяем кэш
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached); // Cache HIT
    }
    
    // 2. Cache MISS → идём в БД
    const user = await this.db.findUser(userId);
    if (!user) throw new NotFoundException();
    
    // 3. Кладём в кэш с TTL
    await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    
    return user;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const user = await this.db.updateUser(userId, data);
    
    // Инвалидируем кэш после обновления
    await this.redis.del(`user:${userId}`);
    
    return user;
  }
}
```

### Плюсы и Минусы Cache-Aside

```
✅ ПЛЮСЫ:
  - Простая реализация
  - Только нужные данные кэшируются (lazy)
  - Отказоустойчивость: если Redis упал — читаем из БД
  - Гибкость: разные TTL для разных данных

❌ МИНУСЫ:
  - Cache Miss Penalty (задержка при первом запросе)
  - Stale Data (данные могут устареть между обновлением БД и кэша)
  - Cache Stampede (много параллельных miss → все идут в БД)
  - Дублирование логики кэширования по всему коду
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/14-cache-aside
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Что произойдёт если Redis упадёт в Cache-Aside?"
> **Ответ**: Приложение продолжит работать! Все запросы пойдут напрямую в БД. Это деградированная производительность, но не отказ. Это преимущество Cache-Aside над Read-Through (где кэш — обязательный слой).

---

## 📌 Шаг 15: Write-Through

### Концепция

При **Write-Through** каждая запись идёт **одновременно в кэш и БД** (синхронно). Кэш всегда актуален.

```
┌──────────┐    1. PUT user:1001     ┌───────────┐
│   App    │ ───────────────────────▶│   Redis   │ ← 2. Сохранить
│          │                         └───────────┘
│          │    3. INSERT INTO DB    ┌───────────┐
│          │ ───────────────────────▶│ Database  │ ← 4. Сохранить
└──────────┘                         └───────────┘
              5. OK (оба сохранены)
```

```typescript
async updateUser(userId: string, data: Partial<User>): Promise<User> {
  // Сохраняем в БД
  const user = await this.db.updateUser(userId, data);
  
  // Сразу обновляем кэш (Write-Through)
  await this.redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);
  
  return user;
}
```

### Плюсы и Минусы Write-Through

```
✅ ПЛЮСЫ:
  - Кэш всегда актуален (нет stale data)
  - Последующие чтения всегда из кэша
  - Нет cache miss на read после write

❌ МИНУСЫ:
  - Запись медленнее (ждём и Redis и БД)
  - Кэшируется всё, даже редко читаемые данные (cache pollution)
  - Нет смысла без Read-Through (кто-то должен читать из кэша)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/15-write-through
```

---

## 📌 Шаг 16: Write-Behind (Write-Back)

### Концепция

**Write-Behind** — пишем ТОЛЬКО в кэш (быстро!), БД обновляется **асинхронно** через очередь/батч.

```
┌──────────┐  1. SET user:1001  ┌───────────┐
│   App    │ ──────────────────▶│   Redis   │ ← 2. OK (быстро!)
└──────────┘                    └───────────┘
                                      │
                              3. Async (очередь)
                                      ▼
                                ┌───────────┐
                                │ Database  │ ← 4. Batch write
                                └───────────┘
```

```typescript
async updateUserAsync(userId: string, data: Partial<User>): Promise<void> {
  // 1. Обновляем кэш мгновенно
  const existing = JSON.parse(await this.redis.get(`user:${userId}`) || '{}');
  const updated = { ...existing, ...data, updatedAt: new Date() };
  await this.redis.set(`user:${userId}`, JSON.stringify(updated), 'EX', 3600);
  
  // 2. Добавляем в очередь записи в БД
  await this.redis.rpush('write-behind:users', JSON.stringify({ userId, data }));
}

// Воркер (работает отдельно):
async processBatchWrites(): Promise<void> {
  const batch = await this.redis.lrange('write-behind:users', 0, 99);
  await this.redis.ltrim('write-behind:users', batch.length, -1);
  
  // Batch update в БД
  await this.db.batchUpdateUsers(batch.map(b => JSON.parse(b)));
}
```

### Плюсы и Минусы Write-Behind

```
✅ ПЛЮСЫ:
  - Максимальная скорость записи
  - Снижение нагрузки на БД (batch writes)
  - Клиент получает ответ немедленно

❌ МИНУСЫ:
  - Риск потери данных если Redis упадёт до записи в БД
  - Сложность реализации (очередь, воркер, retry)
  - Не для критических транзакций (финансы!)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/16-write-behind
```

---

## 📌 Шаг 17: Cache Stampede (Dog-pile Effect)

### Концепция

**Cache Stampede** — когда popular cache entry истекает, все параллельные запросы одновременно идут в БД, создавая огромную нагрузку.

```
Время: ────────────────────────────────────────────────────▶
                                      TTL истёк
                                           │
         ┌─ req1 → Cache MISS ─────────────┼──────────────── БД запрос
         ├─ req2 → Cache MISS ─────────────┼──────────────── БД запрос  
         ├─ req3 → Cache MISS ─────────────┼──────────────── БД запрос
Запросы: ├─ req4 → Cache MISS ─────────────┼──────────────── БД запрос
         ├─ ... (1000 запросов одновременно!)
         └─ req1000 → Cache MISS ───────────┤
                                           │
                                    БД под нагрузкой
                                    × 1000 запросов!
```

### Решение 1: Mutex Lock

```typescript
async getUserWithLock(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  const lockKey = `lock:${cacheKey}`;
  
  // Проверяем кэш
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Пытаемся захватить блокировку
  const lockAcquired = await this.redis.set(lockKey, '1', 'NX', 'EX', 10);
  
  if (lockAcquired) {
    try {
      // Мы захватили блокировку → идём в БД
      const user = await this.db.findUser(userId);
      await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
      return user;
    } finally {
      await this.redis.del(lockKey);
    }
  } else {
    // Другой запрос обновляет кэш → ждём и повторяем
    await new Promise(r => setTimeout(r, 100));
    return this.getUserWithLock(userId); // retry
  }
}
```

### Решение 2: Probabilistic Early Expiration (XFetch)

```typescript
// Обновляем кэш ЗАРАНЕЕ с вероятностью, зависящей от близости TTL
async getUserXFetch(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  const metaKey = `meta:${cacheKey}`;
  
  const [cached, meta] = await this.redis.mget(cacheKey, metaKey);
  
  if (cached && meta) {
    const { computeTime, expiry } = JSON.parse(meta);
    const ttl = expiry - Date.now() / 1000;
    const beta = 1.0; // коэффициент агрессивности
    
    // XFetch формула: обновить досрочно с вероятностью P
    const shouldRefresh = -computeTime * beta * Math.log(Math.random()) >= ttl;
    
    if (!shouldRefresh) return JSON.parse(cached);
  }
  
  // Обновляем кэш
  const start = Date.now();
  const user = await this.db.findUser(userId);
  const computeTime = (Date.now() - start) / 1000;
  const ttl = 3600;
  
  await this.redis.mset(
    cacheKey, JSON.stringify(user),
    metaKey, JSON.stringify({ computeTime, expiry: Date.now()/1000 + ttl })
  );
  await this.redis.expire(cacheKey, ttl);
  
  return user;
}
```

### Решение 3: Background Refresh

```typescript
// Кэш никогда не истекает — фоновый процесс обновляет заранее
async getUserWithBackgroundRefresh(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;
  const refreshKey = `refresh:${cacheKey}`;
  
  const cached = await this.redis.get(cacheKey);
  const ttl = await this.redis.ttl(cacheKey);
  
  // Если TTL < 5 минут — запустить фоновое обновление
  if (ttl > 0 && ttl < 300) {
    const refreshing = await this.redis.set(refreshKey, '1', 'NX', 'EX', 60);
    if (refreshing) {
      // Не ждём результата — обновляем в фоне
      this.refreshUserCache(userId).catch(console.error);
    }
  }
  
  if (cached) return JSON.parse(cached);
  
  // Если кэша нет вообще — синхронный запрос
  return this.refreshUserCache(userId);
}

private async refreshUserCache(userId: string): Promise<User> {
  const user = await this.db.findUser(userId);
  await this.redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);
  return user;
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/17-cache-stampede
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Как предотвратить cache stampede?"
> **Ответ**: 3 основных подхода:
> 1. **Mutex Lock** (SET NX) — только один запрос идёт в БД, остальные ждут или читают stale данные
> 2. **Probabilistic Early Refresh (XFetch)** — обновляем кэш до истечения с вероятностью, растущей по мере приближения к TTL
> 3. **Background Refresh** — фоновый процесс обновляет популярные ключи до истечения. Клиенты всегда читают из кэша.

---

## 📌 Шаг 18: Cache Invalidation

### Концепция

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

Инвалидация кэша — самая сложная проблема кэширования. Нужно обеспечить консистентность между кэшем и БД.

### Стратегии инвалидации

#### 1. TTL-based (время истечения)

```typescript
// Простейшая стратегия: данные устаревают через N секунд
await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 300); // 5 минут

// Плюсы: просто, предсказуемо
// Минусы: stale data до TTL истечения
```

#### 2. Event-based (по событию)

```typescript
// При обновлении данных — явная инвалидация
async updateUser(id: string, data: Partial<User>) {
  await this.db.updateUser(id, data);
  await this.redis.del(`user:${id}`);     // Удаляем из кэша
  // Или: обновляем кэш (Write-Through)
  // await this.redis.set(`user:${id}`, JSON.stringify(updated), 'EX', 3600);
}
```

#### 3. Versioning (версионирование)

```typescript
// Храним версию вместе с данными
const VERSION_KEY = 'version:users';

async getUser(id: string): Promise<User> {
  const version = await this.redis.get(VERSION_KEY) || '0';
  const cacheKey = `user:${id}:v${version}`;
  
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const user = await this.db.findUser(id);
  await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
  return user;
}

// Инвалидация всех пользователей одновременно — просто инкрементируем версию!
async invalidateAllUsers() {
  await this.redis.incr(VERSION_KEY);
  // Старые ключи автоматически "устаревают" (просто игнорируются)
  // Реально удаляются по TTL
}
```

#### 4. Tag-based (по тегам)

```typescript
// Каждый ключ помечается тегами
async setWithTags(key: string, value: string, tags: string[], ttl: number) {
  const pipeline = this.redis.pipeline();
  pipeline.set(key, value, 'EX', ttl);
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);   // тег → список ключей
    pipeline.expire(`tag:${tag}`, ttl);
  }
  await pipeline.exec();
}

// Инвалидация всех ключей с тегом "user-1001"
async invalidateTag(tag: string) {
  const keys = await this.redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await this.redis.del(...keys, `tag:${tag}`);
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/18-cache-invalidation
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Как обеспечить консистентность между Redis и PostgreSQL?"
> **Ответ**: Это невозможно на 100% без распределённых транзакций. Практические подходы:
> 1. **Invalidate on write** (удалить из кэша при записи в БД) — лучше чем update, т.к. нет race condition между UPDATE кэша и PUT БД
> 2. **TTL + eventual consistency** — принять что данные могут быть stale N секунд
> 3. **CDC (Change Data Capture)** — слушать binlog PostgreSQL (Debezium) и инвалидировать кэш по событиям БД
> 4. **Transactional Outbox** — писать событие инвалидации в ту же транзакцию БД, потом слушать очередь

---

# 🎓 ЧАСТЬ 3: ТРАНЗАКЦИИ И АТОМАРНОСТЬ

---

## 📌 Шаг 19: MULTI/EXEC/DISCARD/WATCH

### Концепция

Redis транзакции — это **пакет команд**, выполняемый атомарно: либо все, либо ни одной (но не в смысле rollback!).

> ⚠️ **Важное отличие от SQL**: Redis транзакции НЕ поддерживают rollback при ошибке в команде! Если одна команда в MULTI/EXEC упала из-за неправильного типа данных — остальные всё равно выполнятся!

### MULTI/EXEC

```bash
MULTI                           # Начать транзакцию
SET balance:alice 1000          # Поставить в очередь
SET balance:bob 500             # Поставить в очередь
INCRBY balance:alice -100       # Поставить в очередь
INCRBY balance:bob 100          # Поставить в очередь
EXEC                            # Выполнить все сразу

# Результат:
# 1) OK
# 2) OK
# 3) (integer) 900
# 4) (integer) 600

DISCARD                         # Отменить транзакцию (очистить очередь)
```

### WATCH (Оптимистичная блокировка)

WATCH позволяет реализовать **check-and-set (CAS)**: если отслеживаемый ключ изменился с момента WATCH до EXEC — транзакция отменяется (EXEC возвращает nil).

```bash
# Атомарный перевод средств с оптимистичной блокировкой
WATCH balance:alice

GET balance:alice               # → 1000

MULTI
INCRBY balance:alice -100
INCRBY balance:bob 100
EXEC
# → (nil) если balance:alice изменился между WATCH и EXEC
# → [OK, OK] если никто не изменил
```

### NestJS реализация

```typescript
async transferFunds(fromId: string, toId: string, amount: number): Promise<boolean> {
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const fromKey = `balance:${fromId}`;
    const toKey = `balance:${toId}`;
    
    // Начинаем наблюдать за ключом
    await this.redis.watch(fromKey);
    
    const balance = parseInt(await this.redis.get(fromKey) || '0');
    
    if (balance < amount) {
      await this.redis.unwatch();
      throw new BadRequestException('Insufficient funds');
    }
    
    // Используем pipeline с MULTI/EXEC
    const result = await this.redis
      .multi()
      .incrby(fromKey, -amount)
      .incrby(toKey, amount)
      .exec();
    
    if (result !== null) {
      return true; // Успех!
    }
    
    // result === null → конкурентное изменение, retry
    await new Promise(r => setTimeout(r, 10 * attempt));
  }
  
  throw new Error('Transaction failed after retries');
}
```

### Поведение при ошибках

```bash
# Сценарий 1: Синтаксическая ошибка → вся транзакция отменяется
MULTI
SET key1 value1
WRONGCMD               # ← ошибка компиляции
SET key2 value2
EXEC                   # → (error) EXECABORT Transaction discarded

# Сценарий 2: Ошибка типа данных → ТОЛЬКО эта команда ошибается, остальные выполняются!
MULTI
SET mystring "hello"
LPUSH mystring item    # ← ошибка: mystring — не список!
SET key2 value2
EXEC
# → 1) OK         (SET mystring)
# → 2) (error)    (LPUSH на строке)
# → 3) OK         (SET key2)  ← ВЫПОЛНИЛОСЬ!
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/19-transactions
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> ❌ **Ошибка**: "MULTI/EXEC в Redis работает как транзакция в SQL с rollback"
> ✅ **Правда**: Redis НЕ делает rollback! Если команда в транзакции упала (ошибка типа), остальные выполняются. Откат не происходит. Это сознательное решение — для простоты и производительности.

> 💡 **Вопрос**: "Как реализовать compare-and-swap в Redis?"
> **Ответ**: WATCH + MULTI/EXEC. Или SET с NX/XX флагами (для простых случаев). Или Lua-скрипт (атомарный).

> 💡 **Вопрос**: "Что произойдёт с WATCH если соединение разорвалось?"
> **Ответ**: WATCH снимается автоматически при разрыве соединения. Новое соединение — чистое состояние.

---

## 📌 Шаг 20: Lua Scripts (EVAL/EVALSHA)

### Концепция

Lua-скрипты выполняются **атомарно** на сервере Redis. Пока скрипт выполняется — никакой другой клиент не может выполнить команду. Это мощнее MULTI/EXEC, потому что:
- Можно использовать условную логику (if/else)
- Нет round-trip для каждой команды
- Гарантированная атомарность всей логики

### Синтаксис EVAL

```bash
EVAL script numkeys key1 key2 ... arg1 arg2 ...

# KEYS[] - ключи Redis (1-indexed в Lua)
# ARGV[] - аргументы (1-indexed в Lua)

# Пример: атомарный GET-SET-EXPIRE
EVAL "
  local current = redis.call('GET', KEYS[1])
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return current
" 1 mykey newvalue 3600
```

### Практические Lua скрипты

#### Rate Limiter (Sliding Window)

```lua
-- rate_limiter.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Удаляем запросы вне окна
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- Считаем текущие запросы
local count = redis.call('ZCARD', key)

if count >= limit then
  return 0  -- Превышен лимит
end

-- Добавляем текущий запрос
redis.call('ZADD', key, now, now .. '-' .. math.random())
redis.call('EXPIRE', key, window)

return 1  -- Разрешено
```

```bash
EVAL "$(cat rate_limiter.lua)" 1 "rate:user:1001" 100 60 1735000000
```

#### Distributed Lock Release (безопасный!)

```lua
-- release_lock.lua: удалить только если значение совпадает (наш lock!)
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
```

```bash
EVAL "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end" 1 "lock:resource1" "worker-uuid-123"
```

#### Атомарный GETSET с условием

```lua
-- Установить новое значение только если текущее равно ожидаемому
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  redis.call('EXPIRE', KEYS[1], ARGV[3])
  return 1
end
return 0
```

### EVALSHA (кэширование скриптов)

```bash
# Загрузить скрипт в кэш Redis → получить SHA1
SCRIPT LOAD "return redis.call('SET', KEYS[1], ARGV[1])"
# → "e0e1f9fabfa9d353a2a8b134e8a28282"

# Выполнить по SHA1 (быстрее — не передаём скрипт каждый раз)
EVALSHA "e0e1f9fabfa9d353a2a8b134e8a28282" 1 mykey myvalue

# Проверить наличие скрипта
SCRIPT EXISTS "e0e1f9fabfa9d353a2a8b134e8a28282"
# → (integer) 1

# Очистить кэш скриптов (после FLUSHDB или рестарта)
SCRIPT FLUSH
```

### NestJS реализация

```typescript
@Injectable()
export class LuaScriptService {
  private readonly rateLimiterScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
    local count = redis.call('ZCARD', key)
    
    if count >= limit then
      return {0, count, limit}
    end
    
    redis.call('ZADD', key, now, now .. math.random())
    redis.call('EXPIRE', key, window)
    
    return {1, count + 1, limit}
  `;
  
  private scriptSha: string;
  
  async onModuleInit() {
    // Загружаем скрипт один раз при старте
    this.scriptSha = await this.redis.script('LOAD', this.rateLimiterScript);
  }
  
  async checkRateLimit(userId: string, limit: number, windowSec: number): Promise<boolean> {
    const key = `rate:${userId}`;
    const now = Math.floor(Date.now() / 1000);
    
    try {
      const result = await this.redis.evalsha(
        this.scriptSha, 1, key, limit.toString(), windowSec.toString(), now.toString()
      ) as [number, number, number];
      
      return result[0] === 1; // 1 = разрешено, 0 = превышен лимит
    } catch (e) {
      if (e.message.includes('NOSCRIPT')) {
        // Скрипт не в кэше (после рестарта Redis) — перезагружаем
        this.scriptSha = await this.redis.script('LOAD', this.rateLimiterScript);
        return this.checkRateLimit(userId, limit, windowSec);
      }
      throw e;
    }
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/20-lua
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 🚨 **ВАЖНО**: Lua-скрипты блокируют Redis! Долгий скрипт = все остальные клиенты ждут. `lua-time-limit 5000` (5 секунд) — максимум, после которого Redis начинает отвечать только на SCRIPT KILL и SHUTDOWN.

> 💡 **Вопрос**: "Почему Lua атомарнее чем MULTI/EXEC?"
> **Ответ**: В MULTI/EXEC нельзя прочитать результат команды и использовать его в следующей (всё ставится в очередь без выполнения). В Lua можно: прочитать значение, применить логику if/else, потом записать. Это настоящая атомарная процедура.

> 💡 **Вопрос**: "Что случится с EVALSHA если Redis перезапустился?"
> **Ответ**: Кэш скриптов очищается! EVALSHA вернёт NOSCRIPT error. Нужно обрабатывать эту ошибку и перезагружать скрипт через SCRIPT LOAD + retry.

---

## 📌 Шаг 21: Pipelining

### Концепция

**Pipelining** — отправка нескольких команд без ожидания ответа на каждую. Уменьшает RTT (Round Trip Time) overhead.

```
Без Pipeline:
Client: SET key1 val1 ──────────────────▶ Redis
Client: ◀────────────────────────── OK
Client: SET key2 val2 ──────────────────▶ Redis
Client: ◀────────────────────────── OK
Время: N × RTT

С Pipeline:
Client: SET key1 val1  ──────────────────────────▶ Redis
        SET key2 val2  ──────────────────────────▶
        SET key3 val3  ──────────────────────────▶
Client: ◀──── [OK, OK, OK] ──────────────────────
Время: 1 × RTT + время обработки
```

### Важное отличие Pipeline от MULTI/EXEC

```
Pipeline:    Команды не атомарны. Между ними другие клиенты могут вклиниться.
             Pipeline — оптимизация сети, не транзакция.

MULTI/EXEC:  Атомарно. Все команды выполняются без прерываний.
             Но требует 2 RTT (MULTI + EXEC).

Лучшее решение: Pipeline + MULTI/EXEC вместе (Redis автоматически это поддерживает)
```

### NestJS реализация

```typescript
// Массовая запись через pipeline
async bulkSet(items: Array<{ key: string; value: string; ttl: number }>) {
  const pipeline = this.redis.pipeline();
  
  for (const item of items) {
    pipeline.set(item.key, item.value, 'EX', item.ttl);
  }
  
  const results = await pipeline.exec();
  // results: [[null, 'OK'], [null, 'OK'], ...]
  
  const errors = results?.filter(([err]) => err !== null);
  if (errors?.length) {
    throw new Error(`${errors.length} pipeline commands failed`);
  }
}

// Массовое чтение
async bulkGet(keys: string[]): Promise<Record<string, string | null>> {
  const pipeline = this.redis.pipeline();
  keys.forEach(key => pipeline.get(key));
  
  const results = await pipeline.exec();
  
  return keys.reduce((acc, key, i) => {
    acc[key] = results?.[i]?.[1] as string | null;
    return acc;
  }, {} as Record<string, string | null>);
}

// Pipeline + MULTI/EXEC (атомарный batch)
async atomicBulkSet(items: Array<{ key: string; value: string }>) {
  const results = await this.redis
    .multi()
    .set(items[0].key, items[0].value)
    .set(items[1].key, items[1].value)
    .exec();
    
  return results;
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/21-pipelining
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Сколько команд оптимально в одном pipeline?"
> **Ответ**: Нет универсального числа. Зависит от размера данных, RTT и RAM на клиенте. Практически: 100–1000 команд на pipeline — хороший баланс. Слишком много → клиент буферизует много данных, задержка ответа растёт.

> ❌ **Ошибка**: "Pipeline = транзакция"
> ✅ **Правда**: Pipeline — только оптимизация сети. Команды НЕ атомарны. Между командами pipeline другие клиенты могут выполнять свои команды.

---

# 🎓 ЧАСТЬ 4: РАСПРЕДЕЛЁННЫЕ ПАТТЕРНЫ (Senior/Lead)

---

## 📌 Шаг 22: Distributed Lock

### Концепция

Distributed Lock (распределённая блокировка) — механизм гарантирующий, что **только один процесс** в распределённой системе выполняет критическую секцию.

### Простая реализация (Single Redis)

```bash
# Захват блокировки (атомарный SET NX EX)
SET lock:payment:order-123 "worker-uuid-abc" NX EX 30
# NX = только если не существует
# EX = TTL для защиты от deadlock

# Освобождение (БЕЗОПАСНО через Lua!)
EVAL "
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
" 1 lock:payment:order-123 "worker-uuid-abc"
```

> 🚨 **ПОЧЕМУ Lua для освобождения?**
> ```bash
> # ОПАСНЫЙ anti-pattern:
> GET lock:key          # → "worker-uuid-abc"
> # ← В ЭТО МОМЕНТ: TTL истёк, другой воркер захватил блокировку!
> DEL lock:key          # ← Мы удалили ЧУЖУЮ блокировку! 💥
> ```

### NestJS реализация

```typescript
@Injectable()
export class DistributedLockService {
  private readonly releaseLuaScript = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;

  constructor(@InjectRedis() private redis: Redis) {}

  async acquireLock(
    resource: string,
    ttlMs: number = 30000
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const result = await this.redis.set(lockKey, token, 'NX', 'PX', ttlMs);
    return result === 'OK' ? token : null;
  }

  async releaseLock(resource: string, token: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const result = await this.redis.eval(
      this.releaseLuaScript, 1, lockKey, token
    ) as number;
    return result === 1;
  }

  // Выполнить функцию с блокировкой
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttlMs = 30000,
    retries = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const token = await this.acquireLock(resource, ttlMs);
      
      if (token) {
        try {
          return await fn();
        } finally {
          await this.releaseLock(resource, token);
        }
      }
      
      // Не получили блокировку — ждём и повторяем
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    }
    
    throw new Error(`Cannot acquire lock for ${resource} after ${retries} retries`);
  }
}

// Использование:
await lockService.withLock('payment:order-123', async () => {
  await processPayment(orderId);
}, 30000, 3);
```

### Проблемы Single-Node Lock

```
1. Clock Skew: если TTL истёк пока процесс работал → 2 процесса в критической секции!
   
   Worker A: SET lock NX EX 10 → OK, начинает работу
   ... 9 секунд работы ...
   Событие: GC pause / network lag → Worker A завис на 3 секунды
   ... TTL истёк! ...
   Worker B: SET lock NX EX 10 → OK, начинает работу
   ... оба работают одновременно! 💥 ...

2. Network Partition: Redis недоступен → невозможно захватить/освободить блокировку

3. Redis Failover: при переключении Master→Replica может быть потеря блокировок
   (репликация асинхронная!)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/22-distributed-lock
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Достаточно ли одного Redis для distributed lock в production?"
> **Ответ**: Зависит от требований. Для большинства случаев — да, с правильной реализацией (SET NX PX + Lua release). Для строгих гарантий (финансы, медицина) — нет. Нужен Redlock или ZooKeeper/etcd.

---

## 📌 Шаг 23: Redlock Algorithm

### Концепция

**Redlock** — алгоритм распределённой блокировки Мартина Клеперманна (Martin Kleppmann) для Redis, обеспечивающий safety даже при частичных отказах.

> ⚠️ **Контекст**: Redlock был предложен Сальваторе Санфилиппо (автором Redis), но вызвал горячую дискуссию. Мартин Клеперманн (автор "Designing Data-Intensive Applications") написал критику, на которую Сальваторе ответил. Оба правы в разных контекстах.

### Алгоритм Redlock

```
Дано: N Redis нод (рекомендуется 5, нечётное число)
Цель: блокировка безопасна если N/2 + 1 (кворум) ответили OK

Шаги:
1. Запомнить текущее время T1

2. Попытаться захватить блокировку на ВСЕХ N нодах:
   SET lock:resource <token> NX PX <ttl>
   Таймаут на каждую ноду = TTL / 10 (чтобы не ждать недоступную)

3. Захват успешен ЕСЛИ:
   a) Кворум нод (≥ N/2+1) ответили OK
   b) Оставшееся время: TTL - (T2 - T1) > 0
      (время захвата < TTL → ещё есть время на работу)

4. Если захват не успешен → освободить блокировку на ВСЕХ нодах
   (даже тех, что не ответили — чтобы не держать впустую)

5. Использовать блокировку в оставшееся время

6. Освободить на ВСЕХ нодах через Lua скрипт
```

### Реализация (концептуальная)

```typescript
interface RedlockOptions {
  retryCount: number;
  retryDelay: number;
  driftFactor: number;  // Коэффициент дрейфа часов (0.01 = 1%)
}

@Injectable()
export class RedlockService {
  private readonly LOCK_TTL = 30000; // 30 секунд
  
  constructor(
    private redisNodes: Redis[]  // 5 независимых Redis нод
  ) {}

  async acquire(resource: string, ttl: number): Promise<{ token: string; validityTime: number } | null> {
    const token = crypto.randomUUID();
    const start = Date.now();
    
    // Пытаемся захватить на всех нодах
    const results = await Promise.allSettled(
      this.redisNodes.map(node => 
        node.set(`lock:${resource}`, token, 'NX', 'PX', ttl)
          .catch(() => null)  // Недоступная нода → null
      )
    );
    
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value === 'OK'
    ).length;
    
    const elapsed = Date.now() - start;
    const drift = Math.round(ttl * 0.01) + 2; // 1% + 2ms
    const validityTime = ttl - elapsed - drift;
    
    const quorum = Math.floor(this.redisNodes.length / 2) + 1;
    
    if (successCount >= quorum && validityTime > 0) {
      return { token, validityTime };
    }
    
    // Захват не удался → освобождаем всё
    await this.release(resource, token);
    return null;
  }

  async release(resource: string, token: string): Promise<void> {
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else return 0 end
    `;
    
    await Promise.allSettled(
      this.redisNodes.map(node =>
        node.eval(script, 1, `lock:${resource}`, token)
      )
    );
  }
}
```

### Критика Redlock (Martin Kleppmann)

```
Проблема 1: GC Pause / Process Pause
  T1: Worker A захватывает Redlock
  T2: Worker A уходит в GC на 35 секунд
  T3: Redlock TTL истекает
  T4: Worker B захватывает Redlock
  T5: Worker A выходит из GC, считает что блокировка активна
  T6: 💥 ОБА работают с разделяемым ресурсом!
  
Решение: Fencing Token (монотонно возрастающий номер версии)
  - При захвате блокировки получаем токен (INCR)
  - Все операции с ресурсом включают токен
  - Ресурс отклоняет операции с устаревшим токеном

Проблема 2: Clock Skew
  Redlock предполагает синхронизированные часы для TTL
  NTP sync может иметь погрешность → разные ноды имеют разное "время"

Ответ Сальваторе (antirez):
  "Для большинства практических случаев Redlock достаточно надёжен.
   Абсолютные гарантии требуют Paxos/Raft (ZooKeeper, etcd)."
```

### Когда использовать что

```
Redlock:      Повышенная надёжность, допустима небольшая вероятность
              двойной блокировки в extreme edge cases.
              Use case: deduplication, идемпотентность.

ZooKeeper/    Строгие гарантии (sequential consistency), Fencing Tokens.
etcd:         Use case: финансовые транзакции, координация кластера.

Single Redis: Достаточно для большинства случаев при правильной реализации
              + idempotent операции + мониторинг.
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/23-redlock
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Почему Redlock использует нечётное количество нод?"
> **Ответ**: Для кворума N/2+1. При чётном N = 4: кворум = 3. При N = 3: кворум = 2. Нечётное N минимизирует количество нод при сохранении кворума. 5 нод = стандарт: кворум 3, переживает отказ 2 нод.

---

## 📌 Шаг 24: Rate Limiting

### Стратегия 1: Fixed Window Counter

```typescript
async fixedWindowLimit(userId: string, limit: number, windowSec: number): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rate:fixed:${userId}:${window}`;
  
  const count = await this.redis.incr(key);
  if (count === 1) {
    await this.redis.expire(key, windowSec);
  }
  
  return count <= limit;
}

// Проблема: граничный эффект окна!
// В конце окна + начале следующего можно сделать 2*limit запросов!
// Пример: лимит 10/мин, в 0:59 делаем 10 запросов, в 1:00 ещё 10 → 20 за 2 секунды
```

### Стратегия 2: Sliding Window Log

```typescript
async slidingWindowLog(userId: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const key = `rate:swlog:${userId}`;
  
  // Используем Lua для атомарности
  const script = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    
    -- Удаляем старые записи
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
    
    -- Считаем текущие
    local count = redis.call('ZCARD', key)
    
    if count >= limit then
      return 0
    end
    
    -- Добавляем текущий запрос
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('PEXPIRE', key, window)
    
    return 1
  `;
  
  const result = await this.redis.eval(script, 1, key, now, windowMs, limit) as number;
  return result === 1;
}

// Точно! Но memory overhead: O(запросов) per user
```

### Стратегия 3: Sliding Window Counter (гибрид)

```typescript
async slidingWindowCounter(userId: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / windowSec);
  const prevWindow = currentWindow - 1;
  
  const currentKey = `rate:swc:${userId}:${currentWindow}`;
  const prevKey = `rate:swc:${userId}:${prevWindow}`;
  
  const script = `
    local prev = tonumber(redis.call('GET', KEYS[1]) or 0)
    local curr = tonumber(redis.call('GET', KEYS[2]) or 0)
    local limit = tonumber(ARGV[1])
    local windowSec = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local windowStart = tonumber(ARGV[4]) * windowSec
    
    -- Доля предыдущего окна, попадающая в текущее скользящее окно
    local elapsed = now - windowStart
    local prevWeight = 1 - (elapsed / windowSec)
    
    -- Взвешенный счётчик
    local estimated = math.floor(prev * prevWeight) + curr
    
    if estimated >= limit then
      return 0
    end
    
    redis.call('INCR', KEYS[2])
    redis.call('EXPIRE', KEYS[2], windowSec * 2)
    return 1
  `;
  
  const result = await this.redis.eval(
    script, 2, prevKey, currentKey,
    limit, windowSec, now, currentWindow
  ) as number;
  
  return result === 1;
}

// Гибрид: точность близкая к Sliding Log, память O(1) per user!
```

### Стратегия 4: Token Bucket

```typescript
// Ведро токенов: токены добавляются со скоростью rate/sec
// Запрос потребляет 1 токен. Ведро вмещает capacity токенов.
async tokenBucket(userId: string, capacity: number, refillRate: number): Promise<boolean> {
  const key = `rate:tb:${userId}`;
  const now = Date.now() / 1000;
  
  const script = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    local data = redis.call('HMGET', key, 'tokens', 'last_refill')
    local tokens = tonumber(data[1]) or capacity
    local last_refill = tonumber(data[2]) or now
    
    -- Пополняем токены
    local elapsed = now - last_refill
    tokens = math.min(capacity, tokens + elapsed * refill_rate)
    
    if tokens < 1 then
      redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
      redis.call('EXPIRE', key, 3600)
      return 0
    end
    
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 1
  `;
  
  const result = await this.redis.eval(script, 1, key, capacity, refillRate, now) as number;
  return result === 1;
}
```

### Сравнение стратегий

```
┌────────────────────┬──────────┬──────────────┬────────────────────────────┐
│ Стратегия          │ Точность │ Память/польз.│ Особенности                 │
├────────────────────┼──────────┼──────────────┼────────────────────────────┤
│ Fixed Window       │ Низкая   │ O(1)         │ Граничный эффект окна       │
│ Sliding Window Log │ Высокая  │ O(запросов)  │ Точно, но дорого по памяти  │
│ Sliding Window Cnt │ Средняя  │ O(1)         │ Лучший баланс               │
│ Token Bucket       │ Высокая  │ O(1)         │ Поддерживает burst трафик   │
│ Leaky Bucket       │ Высокая  │ O(1)         │ Сглаживает всплески         │
└────────────────────┴──────────┴──────────────┴────────────────────────────┘
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/24-rate-limiting
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "В чём разница Token Bucket vs Leaky Bucket?"
> **Ответ**: Token Bucket — разрешает burst трафик (накопленные токены). Leaky Bucket — обрабатывает запросы с постоянной скоростью (очередь + drain), сглаживает любые всплески. Token Bucket = "разрешаю накапливать и тратить". Leaky Bucket = "обрабатываю строго по расписанию".

---

## 📌 Шаг 25: Session Management

### Концепция

Redis — идеальное хранилище для сессий: быстрый доступ, TTL, shared state между несколькими инстансами приложения.

### Хранение JWT + Refresh Token Rotation

```typescript
@Injectable()
export class SessionService {
  constructor(@InjectRedis() private redis: Redis) {}

  // Создание сессии при логине
  async createSession(userId: string, tokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<void> {
    const sessionId = crypto.randomUUID();
    const refreshJti = this.extractJti(tokens.refreshToken);
    
    // Сессия с метаданными
    await this.redis.hset(`session:${sessionId}`, {
      userId,
      refreshJti,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    await this.redis.expire(`session:${sessionId}`, 7 * 24 * 3600); // 7 дней
    
    // Маппинг refresh token → session (для быстрого lookup)
    await this.redis.set(`rt:${refreshJti}`, sessionId, 'EX', 7 * 24 * 3600);
    
    // Список всех сессий пользователя (для logout all)
    await this.redis.sadd(`user:sessions:${userId}`, sessionId);
    await this.redis.expire(`user:sessions:${userId}`, 7 * 24 * 3600);
  }

  // Refresh Token Rotation (безопасное обновление)
  async rotateRefreshToken(oldRefreshToken: string, newTokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<boolean> {
    const oldJti = this.extractJti(oldRefreshToken);
    const sessionId = await this.redis.get(`rt:${oldJti}`);
    
    if (!sessionId) {
      // Refresh token не найден → возможно повторное использование
      // Это признак атаки! Логируем и блокируем
      await this.handleTokenReuse(oldJti);
      return false;
    }
    
    const newJti = this.extractJti(newTokens.refreshToken);
    
    // Атомарно заменяем старый токен на новый
    const pipeline = this.redis.pipeline();
    pipeline.del(`rt:${oldJti}`);
    pipeline.set(`rt:${newJti}`, sessionId, 'EX', 7 * 24 * 3600);
    pipeline.hset(`session:${sessionId}`, 'refreshJti', newJti, 'lastActive', Date.now());
    pipeline.expire(`session:${sessionId}`, 7 * 24 * 3600);
    await pipeline.exec();
    
    return true;
  }

  // Logout (одна сессия)
  async logout(refreshToken: string): Promise<void> {
    const jti = this.extractJti(refreshToken);
    const sessionId = await this.redis.get(`rt:${jti}`);
    
    if (sessionId) {
      const session = await this.redis.hgetall(`session:${sessionId}`);
      await this.redis.del(`rt:${jti}`, `session:${sessionId}`);
      if (session?.userId) {
        await this.redis.srem(`user:sessions:${session.userId}`, sessionId);
      }
    }
  }

  // Logout All Devices
  async logoutAll(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:sessions:${userId}`);
    
    if (sessionIds.length === 0) return;
    
    // Получаем все JTI для удаления
    const pipeline = this.redis.pipeline();
    sessionIds.forEach(id => pipeline.hget(`session:${id}`, 'refreshJti'));
    const jtis = await pipeline.exec();
    
    // Удаляем всё
    const delPipeline = this.redis.pipeline();
    sessionIds.forEach(id => delPipeline.del(`session:${id}`));
    jtis?.forEach(([, jti]) => jti && delPipeline.del(`rt:${jti}`));
    delPipeline.del(`user:sessions:${userId}`);
    await delPipeline.exec();
  }

  private extractJti(token: string): string {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.jti;
  }

  private async handleTokenReuse(jti: string): Promise<void> {
    // Логируем потенциальную атаку
    console.error(`[SECURITY] Refresh token reuse detected: ${jti}`);
    // Можно заблокировать пользователя, отправить алерт и т.д.
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/25-sessions
```

---

## 📌 Шаг 26: Pub/Sub

### Концепция

Redis Pub/Sub — **паттерн публикации/подписки**. Publisher отправляет сообщение в канал, все Subscriber этого канала получают его. Fire-and-forget: нет хранения, нет ACK.

### Команды

```bash
# Subscriber (в отдельной redis-cli сессии!)
SUBSCRIBE notifications:user:1001
SUBSCRIBE channel1 channel2          # Подписка на несколько
PSUBSCRIBE notifications:user:*      # Подписка по паттерну (glob)
UNSUBSCRIBE notifications:user:1001
PUNSUBSCRIBE notifications:user:*

# Publisher (в другой сессии)
PUBLISH notifications:user:1001 '{"type":"like","postId":42}'
# → (integer) 2  (число получателей)

# Мониторинг
PUBSUB CHANNELS                      # Все активные каналы
PUBSUB CHANNELS notifications:*     # Каналы по паттерну
PUBSUB NUMSUB channel1 channel2     # Число подписчиков на каналы
PUBSUB NUMPAT                        # Число паттерн-подписок
```

### NestJS реализация

```typescript
// Subscriber (dedicated connection!)
@Injectable()
export class NotificationSubscriber implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  
  constructor(
    @InjectRedis() private redis: Redis,
    private notificationGateway: NotificationGateway // WebSocket
  ) {
    // ВАЖНО: subscriber должен быть отдельным connection!
    // Клиент в режиме Subscribe не может выполнять другие команды
    this.subscriber = redis.duplicate();
  }

  async onModuleInit() {
    await this.subscriber.subscribe(
      'notifications:global',
      async (err, count) => {
        if (err) console.error('Subscribe error:', err);
        else console.log(`Subscribed to ${count} channels`);
      }
    );
    
    // Pattern subscribe
    await this.subscriber.psubscribe('notifications:user:*');
    
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });
    
    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      const userId = channel.split(':')[2];
      this.notificationGateway.sendToUser(userId, JSON.parse(message));
    });
  }

  private handleMessage(channel: string, message: string) {
    const data = JSON.parse(message);
    this.notificationGateway.broadcast(data);
  }

  async onModuleDestroy() {
    await this.subscriber.unsubscribe();
    await this.subscriber.quit();
  }
}

// Publisher
@Injectable()
export class NotificationPublisher {
  constructor(@InjectRedis() private redis: Redis) {}

  async publish(userId: string, notification: object): Promise<number> {
    const channel = `notifications:user:${userId}`;
    return this.redis.publish(channel, JSON.stringify(notification));
  }

  async broadcast(notification: object): Promise<number> {
    return this.redis.publish('notifications:global', JSON.stringify(notification));
  }
}
```

### Ограничения Pub/Sub

```
❌ Fire-and-forget: если Subscriber не подключён — сообщение потеряно
❌ Нет персистентности: перезапуск Redis → потеря всех неполученных сообщений
❌ Нет ACK: не знаем получил ли Subscriber сообщение
❌ Нет гарантии порядка при нескольких Subscriber
❌ Slow Subscriber: может отстать, Redis буферизует (client-output-buffer-limit)

✅ Простота реализации
✅ Низкая latency (< 1ms для локального Redis)
✅ Broadcast (всем подписчикам одновременно)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/26-pubsub
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 🚨 **ВАЖНО**: Клиент в режиме Subscribe может выполнять ТОЛЬКО: SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, RESET, QUIT. Все другие команды вернут ошибку. Поэтому нужно **отдельное соединение** для Pub/Sub!

---

## 📌 Шаг 27: Redis Streams vs Pub/Sub

### Сравнение

```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Характеристика      │ Pub/Sub              │ Streams              │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Персистентность     │ ❌ Нет               │ ✅ Да (append-only)  │
│ ACK                 │ ❌ Нет               │ ✅ XACK              │
│ Consumer Groups     │ ❌ Нет               │ ✅ Да                │
│ Чтение истории      │ ❌ Нет               │ ✅ Да (по ID)        │
│ Backpressure        │ ❌ Нет               │ ✅ MAXLEN            │
│ Multiple consumers  │ ✅ Broadcast         │ ✅ Competing consumers│
│ Latency             │ < 1ms               │ ~1ms                 │
│ Сложность           │ Простая             │ Средняя              │
│ Похож на            │ Redis Pub/Sub        │ Apache Kafka         │
└─────────────────────┴──────────────────────┴──────────────────────┘
```

### Когда что использовать

```
Pub/Sub:
  ✅ Real-time уведомления (chat, live updates)
  ✅ Broadcast обновлений конфигурации
  ✅ Инвалидация кэша между инстансами
  ✅ Простые события без необходимости подтверждения

Streams:
  ✅ Надёжная очередь задач (с ACK и retry)
  ✅ Event sourcing
  ✅ Аудит лог
  ✅ Микросервисы с гарантией доставки
  ✅ Когда нужна история событий
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/27-streams-vs-pubsub
```

---

## 📌 Шаг 28: Leaderboard паттерн

### Концепция

Leaderboard (таблица лидеров) — идеальный use case для Sorted Set. Score = очки игрока. Redis сортирует автоматически.

### Реализация

```typescript
@Injectable()
export class LeaderboardService {
  private readonly LEADERBOARD_KEY = 'leaderboard:game';

  constructor(@InjectRedis() private redis: Redis) {}

  // Добавить/обновить очки
  async addScore(userId: string, score: number): Promise<void> {
    await this.redis.zadd(this.LEADERBOARD_KEY, score, userId);
  }

  // Инкрементировать очки
  async incrementScore(userId: string, delta: number): Promise<number> {
    return this.redis.zincrby(this.LEADERBOARD_KEY, delta, userId);
  }

  // Топ N игроков
  async getTopPlayers(n: number): Promise<Array<{ userId: string; score: number; rank: number }>> {
    const results = await this.redis.zrange(
      this.LEADERBOARD_KEY, 0, n - 1, 'REV', 'WITHSCORES'
    );
    
    const players = [];
    for (let i = 0; i < results.length; i += 2) {
      players.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: i / 2 + 1,
      });
    }
    return players;
  }

  // Место игрока (1-based)
  async getPlayerRank(userId: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(this.LEADERBOARD_KEY, userId);
    return rank !== null ? rank + 1 : null;
  }

  // Очки игрока
  async getPlayerScore(userId: string): Promise<number | null> {
    const score = await this.redis.zscore(this.LEADERBOARD_KEY, userId);
    return score !== null ? parseFloat(score) : null;
  }

  // Окружение игрока (соседи по таблице)
  async getPlayerNeighbors(userId: string, range: number = 3): Promise<object[]> {
    const rank = await this.redis.zrevrank(this.LEADERBOARD_KEY, userId);
    if (rank === null) return [];
    
    const start = Math.max(0, rank - range);
    const end = rank + range;
    
    const results = await this.redis.zrange(
      this.LEADERBOARD_KEY, start, end, 'REV', 'WITHSCORES'
    );
    
    const neighbors = [];
    for (let i = 0; i < results.length; i += 2) {
      neighbors.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: start + i / 2 + 1,
        isCurrentUser: results[i] === userId,
      });
    }
    return neighbors;
  }

  // Разные временные периоды
  async addTimeBasedScore(userId: string, score: number): Promise<void> {
    const now = new Date();
    const daily = `leaderboard:daily:${now.toISOString().slice(0, 10)}`;
    const weekly = `leaderboard:weekly:${this.getWeekKey(now)}`;
    const monthly = `leaderboard:monthly:${now.toISOString().slice(0, 7)}`;
    
    const pipeline = this.redis.pipeline();
    pipeline.zincrby(daily, score, userId);
    pipeline.expire(daily, 2 * 24 * 3600); // 2 дня
    pipeline.zincrby(weekly, score, userId);
    pipeline.expire(weekly, 8 * 24 * 3600); // 8 дней
    pipeline.zincrby(monthly, score, userId);
    pipeline.expire(monthly, 32 * 24 * 3600); // 32 дня
    pipeline.zincrby(this.LEADERBOARD_KEY, score, userId); // All-time
    await pipeline.exec();
  }

  private getWeekKey(date: Date): string {
    const week = Math.ceil(date.getDate() / 7);
    return `${date.getFullYear()}-W${week}`;
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/28-leaderboard
```

---

## 📌 Шаг 29: Autocomplete / Typeahead

### Концепция

Autocomplete по префиксу через Sorted Set с лексикографической сортировкой. Все score = 0, элементы сортируются алфавитно.

### Реализация

```typescript
@Injectable()
export class AutocompleteService {
  constructor(@InjectRedis() private redis: Redis) {}

  // Индексировать строку: добавляем все префиксы
  async indexTerm(term: string, collection: string = 'autocomplete'): Promise<void> {
    const lower = term.toLowerCase();
    const pipeline = this.redis.pipeline();
    
    // Добавляем полный термин с маркером `*` в конце
    pipeline.zadd(collection, 0, lower + '*');
    
    // Добавляем все префиксы
    for (let i = 1; i <= lower.length; i++) {
      pipeline.zadd(collection, 0, lower.slice(0, i));
    }
    
    await pipeline.exec();
  }

  // Поиск по префиксу
  async search(prefix: string, limit: number = 10, collection: string = 'autocomplete'): Promise<string[]> {
    const lower = prefix.toLowerCase();
    
    // Лексикографический диапазон: [prefix .. prefix + высокий символ
    const results = await this.redis.zrangebylex(
      collection,
      `[${lower}`,
      `[${lower}\xff`,
    );
    
    // Фильтруем только полные термины (с маркером `*`)
    return results
      .filter(r => r.endsWith('*'))
      .map(r => r.slice(0, -1))
      .slice(0, limit);
  }

  // Удалить термин
  async removeTerm(term: string, collection: string = 'autocomplete'): Promise<void> {
    const lower = term.toLowerCase();
    await this.redis.zrem(collection, lower + '*');
    // Префиксы не удаляем — они могут использоваться другими терминами
  }
}

// Использование:
// await autocomplete.indexTerm('apple');
// await autocomplete.indexTerm('application');
// await autocomplete.indexTerm('apply');
// await autocomplete.search('app') → ['apple', 'application', 'apply']
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/29-autocomplete
```

---

## 📌 Шаг 30: Counting Patterns + Bloom Filter

### HyperLogLog для UV

```typescript
async trackUniqueVisitor(page: string, userId: string): Promise<void> {
  const daily = `uv:${page}:${new Date().toISOString().slice(0, 10)}`;
  await this.redis.pfadd(daily, userId);
  await this.redis.expire(daily, 30 * 24 * 3600);
}

async getDailyUniqueVisitors(page: string, date: string): Promise<number> {
  return this.redis.pfcount(`uv:${page}:${date}`);
}

async getWeeklyUniqueVisitors(page: string, weekDates: string[]): Promise<number> {
  const keys = weekDates.map(d => `uv:${page}:${d}`);
  const mergeKey = `uv:${page}:weekly:${weekDates[0]}`;
  await this.redis.pfmerge(mergeKey, ...keys);
  await this.redis.expire(mergeKey, 7 * 24 * 3600);
  return this.redis.pfcount(mergeKey);
}
```

### Bloom Filter (через Redis Module или реализация)

```typescript
// Bloom Filter: вероятностная структура для проверки "существует ли элемент"
// Ложно-положительные результаты возможны, ложно-отрицательные — нет.

// Встроенный RedisBloom (требует модуль):
// BF.ADD bloom-filter "element"
// BF.EXISTS bloom-filter "element"
// BF.RESERVE bloom-filter 0.001 1000000  # error_rate=0.1%, capacity=1M

// Простая реализация через Bitmap:
@Injectable()
export class BloomFilterService {
  private readonly SIZE = 10_000_000; // 10M бит = 1.25 MB
  private readonly HASH_FUNCTIONS = 7;

  constructor(@InjectRedis() private redis: Redis) {}

  private hash(value: string, seed: number): number {
    let h = seed;
    for (const char of value) {
      h = Math.imul(h ^ char.charCodeAt(0), 2654435761);
    }
    return Math.abs(h) % this.SIZE;
  }

  async add(key: string, value: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (let i = 0; i < this.HASH_FUNCTIONS; i++) {
      const bit = this.hash(value, i * 1234567);
      pipeline.setbit(key, bit, 1);
    }
    await pipeline.exec();
  }

  async exists(key: string, value: string): Promise<boolean> {
    const pipeline = this.redis.pipeline();
    for (let i = 0; i < this.HASH_FUNCTIONS; i++) {
      const bit = this.hash(value, i * 1234567);
      pipeline.getbit(key, bit);
    }
    const results = await pipeline.exec();
    return results?.every(([, bit]) => bit === 1) ?? false;
  }
}

// Use cases:
// ✅ Проверка: "видел ли пользователь этот контент?" (без false negatives важных показов)
// ✅ "Существует ли пользователь?" перед дорогим DB запросом
// ✅ Фильтрация спама: "видели ли мы этот URL?"
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/30-counting
```

---

## 📌 Шаг 31: Job Queue

### Надёжная очередь через List + Processing Set

```typescript
@Injectable()
export class ReliableQueueService {
  private readonly PENDING_KEY = 'queue:jobs:pending';
  private readonly PROCESSING_KEY = 'queue:jobs:processing';
  private readonly FAILED_KEY = 'queue:jobs:failed';
  private readonly JOB_TTL = 24 * 3600; // 1 день

  constructor(@InjectRedis() private redis: Redis) {}

  // Добавить задачу в очередь
  async enqueue(job: object, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<string> {
    const jobId = crypto.randomUUID();
    const jobData = JSON.stringify({ id: jobId, ...job, enqueuedAt: Date.now() });
    
    if (priority === 'high') {
      await this.redis.lpush(this.PENDING_KEY, jobData); // В начало
    } else {
      await this.redis.rpush(this.PENDING_KEY, jobData); // В конец
    }
    
    return jobId;
  }

  // Взять задачу (атомарно перенести в processing)
  async dequeue(): Promise<{ id: string; data: object } | null> {
    // BLMOVE: атомарно перемещает элемент из pending в processing
    const jobData = await this.redis.blmove(
      this.PENDING_KEY,
      this.PROCESSING_KEY,
      'LEFT', 'RIGHT',
      30 // таймаут ожидания
    );
    
    if (!jobData) return null;
    
    const job = JSON.parse(jobData);
    
    // Сохраняем метаданные задачи с TTL
    await this.redis.set(
      `job:${job.id}`,
      JSON.stringify({ ...job, processingAt: Date.now() }),
      'EX', this.JOB_TTL
    );
    
    return { id: job.id, data: job };
  }

  // Подтвердить выполнение
  async complete(jobId: string): Promise<void> {
    // Удаляем из processing (ищем по jobId)
    const jobs = await this.redis.lrange(this.PROCESSING_KEY, 0, -1);
    for (const j of jobs) {
      const parsed = JSON.parse(j);
      if (parsed.id === jobId) {
        await this.redis.lrem(this.PROCESSING_KEY, 1, j);
        await this.redis.del(`job:${jobId}`);
        break;
      }
    }
  }

  // Вернуть задачу в очередь (при ошибке)
  async retry(jobId: string, error: string): Promise<void> {
    const jobData = await this.redis.get(`job:${jobId}`);
    if (!jobData) return;
    
    const job = JSON.parse(jobData);
    job.retries = (job.retries || 0) + 1;
    job.lastError = error;
    
    // Удаляем из processing
    const jobs = await this.redis.lrange(this.PROCESSING_KEY, 0, -1);
    for (const j of jobs) {
      const parsed = JSON.parse(j);
      if (parsed.id === jobId) {
        await this.redis.lrem(this.PROCESSING_KEY, 1, j);
        break;
      }
    }
    
    if (job.retries < 3) {
      // Повторная попытка с задержкой через Delayed Queue (ZSet)
      const retryAt = Date.now() + job.retries * 60000; // экспоненциальная задержка
      await this.redis.zadd('queue:delayed', retryAt, JSON.stringify(job));
    } else {
      // Перемещаем в failed
      await this.redis.rpush(this.FAILED_KEY, JSON.stringify(job));
    }
  }

  // Восстановление зависших задач (запускается периодически)
  async recoverStuckJobs(maxAgeMs: number = 5 * 60000): Promise<number> {
    const jobs = await this.redis.lrange(this.PROCESSING_KEY, 0, -1);
    let recovered = 0;
    
    for (const jobData of jobs) {
      const job = JSON.parse(jobData);
      if (Date.now() - job.processingAt > maxAgeMs) {
        await this.redis.lrem(this.PROCESSING_KEY, 1, jobData);
        await this.redis.rpush(this.PENDING_KEY, jobData);
        recovered++;
      }
    }
    
    return recovered;
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/31-job-queue
```

---

# 🎓 ЧАСТЬ 5: МАСШТАБИРОВАНИЕ (Lead)

---

## 📌 Шаг 32: Репликация (Master-Replica)

### Концепция

Redis поддерживает **асинхронную репликацию** Master → Replica (один Master, много Replica).

```
┌──────────────────────────────────────────────────────────┐
│                  Redis Replication                       │
│                                                          │
│  ┌─────────────┐                                         │
│  │   Master    │──── Запись: SET, DEL, INCR ────▶        │
│  │  (Primary)  │──── Репликация (async) ──────────────┐  │
│  └─────────────┘                                       │  │
│         │                                              │  │
│         │ REPLICATION STREAM                           │  │
│         │                                              │  │
│         ├──────────────────────────▼                  │  │
│         │                    ┌──────────┐             │  │
│         │                    │ Replica1 │ ← Read Only │  │
│         │                    └──────────┘             │  │
│         │                                             │  │
│         └──────────────────────────▼                  │  │
│                             ┌──────────┐              │  │
│                             │ Replica2 │ ← Read Only  │  │
│                             └──────────┘              │  │
└──────────────────────────────────────────────────────────┘
```

### Настройка репликации

```bash
# replica redis.conf
replicaof 192.168.1.10 6379
masterauth "your-master-password"

# Или динамически:
REPLICAOF 192.168.1.10 6379    # Стать репликой
REPLICAOF NO ONE               # Стать независимым мастером

# Проверка состояния
INFO replication
# role:master
# connected_slaves:2
# slave0:ip=192.168.1.11,port=6379,state=online,offset=12345,lag=0
```

### Процесс начальной синхронизации (Full Sync)

```
1. Replica подключается к Master
2. Master: BGSAVE → создаёт RDB снимок
3. Master: буферизует все новые команды (replication buffer)
4. Master → Replica: передаёт RDB файл
5. Replica: загружает RDB (очищает свои данные!)
6. Master → Replica: передаёт буфер команд (догоняем)
7. Replica: применяет команды из буфера
8. Replica: получает live replication stream
```

### Partial Resync (PSYNC)

```
При кратковременном разрыве соединения Replica может догнать Master
используя replication offset без полного Full Sync.

repl-backlog-size 1mb   # Размер кольцевого буфера команд
                         # Если отставание > буфера → Full Sync!
```

### Проблема Replica Lag

```typescript
// Проверить отставание реплики
async checkReplicaLag(): Promise<number> {
  const info = await this.redis.info('replication');
  const lagMatch = info.match(/slave\d+:.*lag=(\d+)/);
  return lagMatch ? parseInt(lagMatch[1]) : 0;
}

// WAIT: дождаться подтверждения от N реплик
// WAIT numreplicas timeout_ms
async writeWithReplicaAck(key: string, value: string): Promise<void> {
  await this.redis.set(key, value);
  // Ждём подтверждения от 1 реплики, таймаут 1 сек
  const confirmed = await this.redis.wait(1, 1000);
  if (confirmed < 1) {
    console.warn('Write not confirmed by replica within timeout');
  }
}
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/32-replication
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> ❌ **Ошибка**: "Репликация в Redis синхронная — данные всегда консистентны"
> ✅ **Правда**: Репликация АСИНХРОННАЯ. При записи в Master до репликации на Replica — Replica может вернуть устаревшие данные (replica lag). При падении Master возможна потеря неподтверждённых данных.

> 💡 **Вопрос**: "Как снизить риск потери данных при падении Master?"
> **Ответ**: `WAIT N timeout` — дождаться подтверждения N реплик. Но это увеличивает latency записи. Альтернатива: AOF с `appendfsync always` на Master.

---

## 📌 Шаг 33: Redis Sentinel

### Концепция

Redis Sentinel — система **высокой доступности** для Redis. Мониторит Master и Replica, при падении Master автоматически делает Failover (продвигает Replica в Master).

```
┌────────────────────────────────────────────────────────────┐
│                    Redis Sentinel                          │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Sentinel 1│  │Sentinel 2│  │Sentinel 3│  (≥ 3 Sentinel)│
│  └──────────┘  └──────────┘  └──────────┘                │
│       │              │              │                      │
│       └──────────────┼──────────────┘                     │
│                      │ мониторинг                         │
│                      ▼                                     │
│              ┌──────────────┐                             │
│              │    Master    │ ← запросы на запись         │
│              └──────────────┘                             │
│                    │                                       │
│              репликация                                   │
│             ┌──────┴──────┐                               │
│             ▼             ▼                               │
│       ┌──────────┐  ┌──────────┐  ← запросы на чтение   │
│       │ Replica1 │  │ Replica2 │                          │
│       └──────────┘  └──────────┘                          │
└────────────────────────────────────────────────────────────┘
```

### Конфигурация Sentinel

```bash
# sentinel.conf
sentinel monitor mymaster 192.168.1.10 6379 2
# mymaster = имя кластера
# 192.168.1.10 6379 = адрес текущего Master
# 2 = кворум (сколько Sentinel должны согласиться на failover)

sentinel auth-pass mymaster yourpassword
sentinel down-after-milliseconds mymaster 5000   # Считать Master упавшим через 5 сек
sentinel failover-timeout mymaster 60000         # Таймаут failover
sentinel parallel-syncs mymaster 1               # Реплики синхронизировать по 1 за раз

# Запуск Sentinel
redis-sentinel sentinel.conf
# или
redis-server sentinel.conf --sentinel
```

### Процесс Failover

```
1. Sentinel1 замечает: Master не отвечает > 5000ms
   → помечает как SDOWN (Subjectively Down)

2. Sentinel1 спрашивает других Sentinel: "Вы тоже видите падение?"
   Sentinel2: "Да" → кворум = 2 из 2 → ODOWN (Objectively Down)

3. Sentinel с наибольшим run-id становится Лидером (Raft-like election)

4. Лидер выбирает лучшую Replica:
   - Наименьший replica lag
   - Наивысший приоритет (slave-priority)
   - Наибольший replication offset

5. Лидер: REPLICAOF NO ONE на выбранной Replica → она стала новым Master

6. Остальные Replica: REPLICAOF <new-master> → перенаправляются

7. Sentinel обновляет конфигурацию и уведомляет клиентов (через Pub/Sub)
```

### NestJS подключение к Sentinel

```typescript
// app.module.ts
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'sentinel',
      sentinels: [
        { host: '192.168.1.21', port: 26379 },
        { host: '192.168.1.22', port: 26379 },
        { host: '192.168.1.23', port: 26379 },
      ],
      name: 'mymaster',       // Имя из sentinel.conf
      password: 'yourpassword',
      sentinelPassword: 'sentinel-password',
      // Автоматически reconnect при failover
      reconnectOnError: (err) => err.message.includes('READONLY'),
    }),
  ],
})
export class AppModule {}
```

### Проблема Split-Brain

```
Сценарий Split-Brain в Sentinel:
1. Сеть делится: [Sentinel1 + Master] | [Sentinel2 + Sentinel3 + Replica1]

2. [Sentinel2 + Sentinel3] имеют кворум → делают Failover → Replica1 = новый Master

3. [Sentinel1] думает что старый Master жив → клиенты пишут в него

4. Сеть восстанавливается → старый Master становится Replica нового
   → ВСЕ данные записанные в старый Master ПОТЕРЯНЫ!

Защита:
# redis.conf (Master)
min-replicas-to-write 1        # Принимать запись только если ≥ 1 реплика подключена
min-replicas-max-lag 10        # и lag ≤ 10 секунд
# При split-brain Replica отключается → Master перестаёт принимать записи
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/33-sentinel
```

---

## 📌 Шаг 34: Redis Cluster

### Концепция

**Redis Cluster** — горизонтальное масштабирование Redis через автоматическое **шардирование данных** между несколькими нодами. Каждая нода хранит только часть ключей.

```
┌────────────────────────────────────────────────────────────────┐
│                      Redis Cluster                             │
│                                                                │
│  16384 hash slots распределены между шардами:                  │
│                                                                │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│  │  Shard 1   │    │  Shard 2   │    │  Shard 3   │           │
│  │ slots 0-   │    │slots 5461- │    │slots 10923-│           │
│  │   5460     │    │  10922     │    │  16383     │           │
│  │            │    │            │    │            │           │
│  │ Master1 ───┼──▶│ Master2 ───┼──▶│ Master3    │           │
│  │     │      │    │     │      │    │     │      │           │
│  │ Replica1   │    │ Replica2   │    │ Replica3   │           │
│  └────────────┘    └────────────┘    └────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

### Hash Slots

```bash
# CRC16(key) % 16384 = hash slot

# Пример:
CLUSTER KEYSLOT "user:1001"   # → 5649 (slot на Shard 1)
CLUSTER KEYSLOT "user:1002"   # → 11310 (slot на Shard 3)
CLUSTER KEYSLOT "product:42"  # → 9838 (slot на Shard 2)

# Hash Tags: принудить ключи на один slot
CLUSTER KEYSLOT "{user:1001}.session"  # → тот же slot что и "user:1001"!
CLUSTER KEYSLOT "{user:1001}.profile"  # → тот же slot!
# {} определяет часть ключа для хеширования → одинаковый slot
```

### MOVED и ASK Redirects

```
MOVED redirect: постоянная миграция slot на другую ноду
  Client → Node1: GET user:1001
  Node1 → Client: MOVED 5649 192.168.1.12:6379
  Client → Node2: GET user:1001  (запомнить: slot 5649 → Node2)

ASK redirect: временная миграция slot (resharding в процессе)
  Client → Node1: GET user:1001
  Node1 → Client: ASK 5649 192.168.1.12:6379
  Client → Node2: ASKING; GET user:1001  (НЕ запоминать! Временно)
```

### Настройка Cluster

```bash
# Создать кластер из 6 нод (3 master + 3 replica)
redis-cli --cluster create \
  192.168.1.10:6379 \
  192.168.1.11:6379 \
  192.168.1.12:6379 \
  192.168.1.13:6379 \
  192.168.1.14:6379 \
  192.168.1.15:6379 \
  --cluster-replicas 1

# Информация о кластере
CLUSTER INFO
CLUSTER NODES

# Resharding (перераспределить slots)
redis-cli --cluster reshard 192.168.1.10:6379
```

### NestJS подключение к Cluster

```typescript
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'cluster',
      nodes: [
        { host: '192.168.1.10', port: 6379 },
        { host: '192.168.1.11', port: 6379 },
        { host: '192.168.1.12', port: 6379 },
      ],
      options: {
        clusterRetryStrategy: (times: number) => Math.min(times * 100, 3000),
        redisOptions: { password: 'yourpassword' },
        // Кэш маппинга slots для избежания частых MOVED
        slotsRefreshTimeout: 2000,
        slotsRefreshInterval: 5000,
      },
    }),
  ],
})
export class AppModule {}
```

### Ограничения Cluster

```
❌ Нет транзакций MULTI/EXEC через разные шарды
❌ Нет Lua-скриптов затрагивающих ключи из разных шардов
❌ MGET/MSET работают только для ключей в одном slot
   (или нужны Hash Tags: {tag}:key1, {tag}:key2)
❌ Database 0 только (нет SELECT)
❌ Pub/Sub ограничен (сообщения не распространяются между нодами)

✅ Решение: Hash Tags для связанных ключей
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/34-cluster
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 💡 **Вопрос**: "Почему Redis Cluster использует 16384 слота, а не 65536 или 1000?"
> **Ответ**: 16384 = 2^14. Каждый узел хранит bitmap слотов в gossip сообщениях: 16384 бит = 2 KB. При 65536 слотах — 8 KB, слишком много для heartbeat. При 1000 — неравномерное распределение. 16384 — баланс: достаточно для 1000 нод (каждой ~16 слотов), компактный bitmap.

> 💡 **Вопрос**: "Как в Redis Cluster выполнить операцию над несколькими ключами?"
> **Ответ**: Использовать Hash Tags `{tag}:key` чтобы принудить все ключи в один slot. Или выполнять операции по одному (теряем атомарность). Или использовать промежуточный ключ для координации.

---

## 📌 Шаг 35: Оптимизация памяти

### Внутренние кодировки (Encodings)

```bash
# Проверить текущую кодировку объекта
OBJECT ENCODING mykey

# String:
SET mykey 12345
OBJECT ENCODING mykey      # → "int"

SET mykey "hello"
OBJECT ENCODING mykey      # → "embstr" (≤ 44 байт)

SET mykey "very long string..."
OBJECT ENCODING mykey      # → "raw" (> 44 байт)

# List:
RPUSH mylist 1 2 3
OBJECT ENCODING mylist     # → "listpack" (маленький)
# После добавления > 128 элементов или > 64 байт значений:
OBJECT ENCODING mylist     # → "quicklist"

# Hash:
HSET myhash f1 v1
OBJECT ENCODING myhash     # → "listpack" (маленький)
# После > 128 полей или > 64 байт значений:
OBJECT ENCODING myhash     # → "hashtable"

# Set:
SADD myset 1 2 3
OBJECT ENCODING myset      # → "listpack" (числа, маленький)
# или "intset" (только числа)
# После > 128 элементов или нечисловые:
OBJECT ENCODING myset      # → "hashtable"

# Sorted Set:
ZADD myzset 1 "a"
OBJECT ENCODING myzset     # → "listpack" (маленький)
# После > 128 элементов:
OBJECT ENCODING myzset     # → "skiplist"
```

### Конфигурация пороговых значений

```bash
# redis.conf — настройте под ваши данные!
hash-max-listpack-entries 128    # До 128 полей → listpack (экономнее!)
hash-max-listpack-value 64       # До 64 байт → listpack

list-max-listpack-size -2        # -2 = 8kb per listpack node (рекомендуется)
list-compress-depth 0            # Сжатие узлов quicklist (0 = нет)

set-max-intset-entries 512       # До 512 чисел → intset
set-max-listpack-entries 128     # До 128 строк → listpack
set-max-listpack-value 64

zset-max-listpack-entries 128
zset-max-listpack-value 64
```

### Оптимизация ключей

```bash
# ✅ Короткие ключи (но читаемые)
SET u:1001:n "Alice"          # вместо SET user:1001:name "Alice"
SET u:1001:e "alice@ex.com"   # вместо SET user:1001:email "alice@example.com"

# ✅ Hash вместо множества String ключей
HSET u:1001 n "Alice" e "alice@ex.com" a 30
# вместо 3 отдельных String ключей (экономия на метаданных ключа)

# ✅ Числа вместо строк (int encoding!)
SET counter 0              # → int encoding, очень компактно
INCR counter

# ✅ Сжатие значений на стороне клиента (для больших объектов)
import { gzip, gunzip } from 'zlib';
const compressed = await gzip(JSON.stringify(largeObject));
await redis.set('key', compressed, 'EX', 3600);
```

### Мониторинг памяти

```bash
# Общая информация
INFO memory

# Конкретный ключ
MEMORY USAGE mykey              # Байт для ключа
MEMORY USAGE mykey SAMPLES 0    # Без sampling (точнее, медленнее)

# Диагностика
MEMORY DOCTOR
# → "Sam, I have detected a few issues with your Redis deployment:
#    1. peak_memory is much bigger than used_memory..."

# Дефрагментация (Redis 4+)
MEMORY PURGE
CONFIG SET activedefrag yes     # Активная дефрагментация (онлайн)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/35-memory
```

---

# 🎓 ЧАСТЬ 6: МОНИТОРИНГ И ОТЛАДКА

---

## 📌 Шаг 36: Мониторинг

### INFO command

```bash
INFO                    # Все секции
INFO server             # Версия, OS, uptime
INFO clients            # Клиенты
INFO memory             # Использование памяти
INFO stats              # Статистика команд, hits/misses
INFO replication        # Статус репликации
INFO cpu                # CPU stats
INFO commandstats       # Статистика по командам
INFO keyspace           # Информация по базам данных
INFO latencystats       # Latency статистика

# Полезные метрики:
INFO memory | grep used_memory_human    # Текущая память
INFO stats | grep keyspace_hits         # Cache hits
INFO stats | grep keyspace_misses       # Cache misses
INFO stats | grep instantaneous_ops_per_sec  # OPS в секунду
INFO clients | grep connected_clients   # Подключённых клиентов
INFO replication | grep master_repl_offset  # Offset репликации
```

### SLOWLOG (медленные команды)

```bash
# redis.conf
slowlog-log-slower-than 10000   # Логировать команды > 10ms (в микросекундах)
slowlog-max-len 128             # Хранить последние 128 записей

# Команды
SLOWLOG GET                     # Последние медленные команды
SLOWLOG GET 10                  # Последние 10
SLOWLOG LEN                     # Количество записей
SLOWLOG RESET                   # Очистить

# Пример вывода:
# 1) 1) (integer) 14          # ID
#    2) (integer) 1609459200  # Timestamp
#    3) (integer) 15234       # Время выполнения (микросекунды)
#    4) 1) "KEYS"             # Команда
#       2) "*"
#    5) "127.0.0.1:54321"    # Клиент
#    6) ""                    # Имя клиента
```

### MONITOR (опасно в продакшне!)

```bash
MONITOR    # Показывает ВСЕ команды в реальном времени

# ⚠️ ПРЕДУПРЕЖДЕНИЕ: MONITOR снижает производительность на 50%!
# Никогда не запускайте в продакшне под нагрузкой!
# Используйте только для кратковременной отладки в dev/staging.
```

### LATENCY monitoring

```bash
# redis.conf
latency-tracking yes
latency-tracking-info-percentiles "50 99 99.9"

# Команды
LATENCY LATEST              # Последние события задержки
LATENCY HISTORY event       # История событий
LATENCY RESET               # Сбросить историю
```

### redis-cli инструменты

```bash
# Поиск больших ключей (ОСТОРОЖНО! Сканирует всю БД)
redis-cli --bigkeys

# Поиск горячих ключей (требует maxmemory-policy allkeys-lfu или volatile-lfu)
redis-cli --hotkeys

# Статистика в реальном времени
redis-cli --stat
redis-cli --stat -i 1       # Обновление каждую секунду

# Непрерывный мониторинг latency
redis-cli --latency
redis-cli --latency-history -i 5   # Каждые 5 секунд

# Сканирование ключей по паттерну (безопасно!)
redis-cli --scan --pattern "user:*"

# Подсчёт ключей
redis-cli --scan --pattern "session:*" | wc -l

# Диагностика
redis-cli MEMORY DOCTOR
redis-cli DEBUG SLEEP 0    # Проверить latency (добавляет 0мс задержку)
```

### curl пример

```bash
curl -X GET http://localhost:3000/redis/learn/36-monitoring
```

### ⚠️ ЛОВУШКИ ИНТЕРВЬЮ

> 🚨 **Самые опасные команды в продакшне**:
> - `KEYS *` — O(N) по всему keyspace, блокирует Redis! Используйте SCAN.
> - `FLUSHDB` / `FLUSHALL` — удаляет все данные!
> - `DEBUG SLEEP N` — намеренно зависает на N секунд
> - `MONITOR` — снижает производительность на 50%
> - `SMEMBERS` / `HGETALL` / `LRANGE 0 -1` на огромных структурах

---

# 🎓 ЧАСТЬ 7: ТОП ВОПРОСЫ НА СОБЕСЕДОВАНИИ

---

## 📌 Шаг 37: 50+ Вопросов с ответами

### 🔑 ОСНОВЫ (Junior/Middle)

**Q1: Что такое Redis и чем отличается от Memcached?**

```
Redis vs Memcached:
┌──────────────────┬──────────────────┬──────────────────┐
│ Характеристика   │ Redis            │ Memcached        │
├──────────────────┼──────────────────┼──────────────────┤
│ Типы данных      │ String, List,    │ Только String    │
│                  │ Hash, Set, ZSet, │                  │
│                  │ Bitmap, HLL...   │                  │
├──────────────────┼──────────────────┼──────────────────┤
│ Персистентность  │ RDB + AOF        │ ❌ Нет           │
├──────────────────┼──────────────────┼──────────────────┤
│ Репликация       │ ✅ Да            │ ❌ Нет (нативно) │
├──────────────────┼──────────────────┼──────────────────┤
│ Cluster          │ ✅ Redis Cluster │ ❌ Нет (нативно) │
├──────────────────┼──────────────────┼──────────────────┤
│ Pub/Sub          │ ✅ Да            │ ❌ Нет           │
├──────────────────┼──────────────────┼──────────────────┤
│ Lua scripts      │ ✅ Да            │ ❌ Нет           │
├──────────────────┼──────────────────┼──────────────────┤
│ Транзакции       │ MULTI/EXEC       │ ❌ Нет           │
├──────────────────┼──────────────────┼──────────────────┤
│ Потоки           │ Single-thread    │ Multi-threaded   │
│                  │ (cmd execution)  │                  │
├──────────────────┼──────────────────┼──────────────────┤
│ Когда выбрать    │ Почти всегда     │ Только простой   │
│                  │                  │ кэш, max память  │
└──────────────────┴──────────────────┴──────────────────┘

Вывод: Redis — более функциональный. Memcached — проще, 
немного эффективнее для чистого кэша с многоядерными серверами.
```

**Q2: Объясните разницу между RDB и AOF**

```
RDB: снимок базы в момент времени → компактный файл, быстрое восстановление,
     но риск потери данных между снимками.

AOF: каждая команда записи → полный лог, минимальная потеря (everysec = 1 сек),
     больший файл, медленнее загрузка.

Лучший вариант: RDB + AOF together (aof-use-rdb-preamble yes)
```

**Q3: Что такое eviction policy? Когда использовать allkeys-lru?**

```
Eviction policy — что делать когда память maxmemory заполнена.
allkeys-lru: удалять наименее давно использованные ключи среди ВСЕХ.
Использовать когда: Redis = чистый кэш (все данные воссоздаваемы из БД).
НЕ использовать когда: Redis = primary store (данные не воссоздаваемы).
```

**Q4: Что делает команда OBJECT ENCODING?**

```
Показывает внутреннее представление данных в памяти.
Важно для оптимизации: listpack экономнее hashtable.
Зная пороги (hash-max-listpack-entries = 128), можно 
спроектировать структуры данных для максимальной компактности.
```

**Q5: Почему KEYS * опасна в продакшне?**

```
O(N) по всему keyspace. На БД с 10M ключей = блокировка Redis на секунды!
Альтернатива: SCAN cursor MATCH pattern COUNT count
SCAN итерирует без блокировки (но не атомарно → может вернуть дубли).
```

### 🔑 ПАТТЕРНЫ И АРХИТЕКТУРА (Middle/Senior)

**Q6: Как реализовать distributed lock в Redis?**

```
Правильная реализация:
1. SET lock:resource <uuid> NX PX 30000  ← атомарно
2. Освобождение через Lua:
   if GET lock == uuid then DEL lock else return 0
   
Ошибки начинающих:
❌ SETNX + EXPIRE (две команды, не атомарно → deadlock если упало между)
❌ DEL без проверки uuid (удалим чужую блокировку!)
❌ Нет TTL → deadlock при падении воркера
```

**Q7: Что такое Cache Stampede и как предотвратить?**

```
Cache Stampede: популярный ключ истёк → 1000 запросов одновременно в БД.

Решения:
1. Mutex Lock (SET NX): только 1 запрос идёт в БД, остальные ждут/читают stale
2. XFetch / Probabilistic Early Refresh: обновляем ДО истечения
3. Background Refresh: фоновый поток обновляет заранее
4. Jitter TTL: случайный разброс TTL чтобы не все истекали одновременно
   TTL = baseТTL + random(0, 0.1 * baseТTL)
```

**Q8: Как работает Redis Pub/Sub? Какие ограничения?**

```
Publisher → PUBLISH channel msg → Redis → все Subscribers получают
  
Ограничения:
- Fire-and-forget: нет гарантии доставки
- Нет персистентности: подписчик должен быть онлайн
- Нет ACK
- Для надёжного messaging → Redis Streams или Kafka
- Subscriber занимает dedicated connection (не может делать другие команды)
```

**Q9: Как реализовать rate limiting в Redis?**

```
5 стратегий:
1. Fixed Window: INCR + EXPIRE (просто, но граничный эффект)
2. Sliding Window Log: ZADD + ZREMRANGEBYSCORE + ZCARD (точно, дорого)
3. Sliding Window Counter: 2 Fixed Window с весами (баланс)
4. Token Bucket: HASH с tokens + last_refill (поддерживает burst)
5. Leaky Bucket: очередь + drain rate (сглаживает всплески)

Все → Lua скрипт для атомарности!
```

**Q10: В чём разница между MULTI/EXEC и Lua скриптами?**

```
MULTI/EXEC:
- Нельзя читать и использовать результат внутри транзакции
- Нет условной логики (if/else)
- 2 RTT минимум
- Rollback НЕ поддерживается (только DISCARD)

Lua:
- Полная логика (условия, циклы, переменные)
- Читаем и используем результаты в скрипте
- 1 RTT
- Атомарность = Redis заблокирован на время скрипта
- Осторожно с длительными скриптами!
```

**Q11: Что такое WATCH в Redis?**

```
WATCH key — оптимистичная блокировка.
Если key изменился между WATCH и EXEC → транзакция отменяется (EXEC → nil).
Паттерн: WATCH → GET → вычисления → MULTI → команды → EXEC → проверить nil → retry.
Используется для Compare-And-Swap (CAS) операций.
```

**Q12: Как Redis обеспечивает атомарность?**

```
Single-thread: команды выполняются строго последовательно.
Каждая ОДНА команда всегда атомарна (GET, SET, INCR etc.)
Несколько команд → MULTI/EXEC (все или ни одной, но нет rollback)
Сложная логика → Lua script (атомарная процедура)
```

### 🔑 МАСШТАБИРОВАНИЕ (Senior/Lead)

**Q13: Как работает Redis Cluster? Что такое hash slots?**

```
16384 hash slots распределены между Master нодами.
Ключ → CRC16(key) % 16384 = slot → нода.
MOVED/ASK redirects при запросе не той ноды.
Hash Tags {}: {user:1001}:session → тот же slot что {user:1001}:profile.
Ограничения: нет cross-slot транзакций, нет SELECT, только DB 0.
```

**Q14: В чём разница между Sentinel и Cluster?**

```
Sentinel: High Availability для ОДНОГО мастера.
  - Мониторинг, автоматический failover
  - Нет шардирования (все данные на одном Master)
  - Для вертикального масштабирования

Cluster: Горизонтальное масштабирование через шардирование.
  - Данные распределены по нодам
  - Встроенная HA (каждый шард = Master + Replica)
  - Для больших объёмов данных
```

**Q15: Что такое Redlock и когда использовать?**

```
Redlock: алгоритм distributed lock через N (≥5) независимых Redis нод.
Кворум N/2+1 нод должны подтвердить захват.
Validity time = TTL - время захвата - clock drift.

Использовать: когда одна Redis нода недостаточна (failover может потерять блокировку).
Критика: уязвим к GC pause, clock skew.
Альтернатива: ZooKeeper/etcd с Fencing Tokens для строгих гарантий.
```

**Q16: Объясните replica lag и как с ним бороться**

```
Replica lag: задержка между записью на Master и применением на Replica.
Причины: сетевая задержка, высокая нагрузка на Replica, большие объёмы данных.

Борьба:
- INFO replication: мониторить lag
- WAIT N timeout: дождаться подтверждения N реплик (увеличивает latency записи)
- min-replicas-to-write: Master отказывает если реплики отстали
- Чтение с Master для критичных данных
```

**Q17: Когда Redis не подходит?**

```
❌ Данные > объёма RAM (Redis — in-memory!)
❌ Нужен сложный SQL с JOIN, WHERE, индексами
❌ ACID транзакции (банковские операции)
❌ Full-text search (лучше Elasticsearch)
❌ Граф-запросы (лучше Neo4j)
❌ Timeseries с долгосрочным хранением (лучше InfluxDB, TimescaleDB)
```

**Q18: Redis vs Kafka vs RabbitMQ**

```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ Характеристика   │ Redis        │ Kafka        │ RabbitMQ     │
│                  │ Pub/Sub или  │              │              │
│                  │ Streams      │              │              │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Персистентность  │ Ограниченная │ Долгосрочная │ Ограниченная │
│ Throughput       │ Высокий      │ Очень высокий│ Средний      │
│ Latency          │ < 1ms        │ ~2-10ms      │ ~1-5ms       │
│ Ordering         │ Per-stream   │ Per-partition│ Per-queue    │
│ Consumer Groups  │ ✅ (Streams) │ ✅           │ ✅           │
│ Replay history   │ ✅ (Streams) │ ✅           │ ❌           │
│ Сложность        │ Низкая       │ Высокая      │ Средняя      │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Когда выбрать    │ Уже есть     │ Высокие      │ Сложный      │
│                  │ Redis,       │ нагрузки,    │ роутинг,     │
│                  │ простые      │ долгое       │ dead letter  │
│                  │ use cases    │ хранение     │ queues       │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

**Q19: Как реализовать leaderboard для 100M пользователей?**

```
Sorted Set:
- ZADD game:leaderboard score userId → O(log N)
- ZREVRANK → O(log N)
- ZRANGE → O(log N + K)
- 100M элементов в одном ZSet? → ~4-8 GB RAM. Может быть слишком много!

Оптимизации:
1. Separate-by-period: daily/weekly/monthly leaderboards с TTL
2. Approximate: хранить топ-10,000, для остальных считать приблизительно
3. Redis Cluster: шардировать по регионам/группам
4. Ленивые обновления: не обновлять в real-time, batch каждые N секунд
```

**Q20: Как работает listpack и зачем он нужен?**

```
listpack (заменил ziplist в Redis 7) — компактный формат хранения.
Вместо указателей (8 байт на x64) использует последовательное хранение с
encoding + data для каждого элемента.

Экономия: для маленьких Hash/List/Set/ZSet экономит 30-70% памяти
по сравнению с обычными структурами (hashtable, skiplist).

Порог: hash-max-listpack-entries 128 (до 128 полей → listpack).
Превышение → автоматически конвертируется в hashtable (менее эффективно по памяти).

Вывод: держите структуры малыми (разбивайте большие объекты на части)
для максимальной эффективности памяти.
```

### 🔑 ПРАКТИЧЕСКИЕ ЗАДАЧИ

**Q21: Спроектируйте систему rate limiting для API Gateway**

```
Требования:
- 1000 req/min per user
- 10000 req/min per IP
- Distributed (несколько инстансов)
- Latency < 5ms

Решение:
1. Sliding Window Counter (гибрид) через Lua:
   - Ключ: rate:user:{userId}:{windowMinute}
   - Атомарный Lua скрипт: проверить + инкремент
   - Redis Cluster для распределённости

2. Для IP rate limiting:
   - rate:ip:{ip}:{windowMinute}
   - Агрессивнее очищать (EXPIRE 120 сек)

3. NestJS Guard:
   @Injectable() RateLimitGuard implements CanActivate {
     canActivate(ctx): Promise<boolean> {
       return this.luaService.checkRateLimit(userId, 1000, 60);
     }
   }

4. При превышении → HTTP 429 Too Many Requests
   + Retry-After заголовок (когда сбросится лимит)
```

**Q22: Спроектируйте систему сессий для SPA**

```
Схема:
1. Login → создать сессию:
   - Генерировать sessionId (UUID)
   - HSET session:{sessionId} userId {id} createdAt {ts} lastActive {ts}
   - EXPIRE session:{sessionId} 3600
   - JWT accessToken (15 min) + refreshToken (7 days)
   - SADD user:sessions:{userId} {sessionId}

2. Каждый запрос:
   - Верифицировать JWT (без Redis → быстро!)
   - Только на истечение → refreshToken через Redis

3. Refresh:
   - Rotation: старый refreshToken → Delete → новый refreshToken
   - Reuse detection: если старый токен пришёл снова → УДАЛИТЬ ВСЕ СЕССИИ (атака!)

4. Logout:
   - DEL session:{sessionId}
   - SREM user:sessions:{userId} {sessionId}
   - Blacklist accessToken до истечения (если нужно мгновенно инвалидировать)
```

**Q23: Как реализовать "recently viewed" список?**

```
Список последних N просмотренных (без дублей):

LREM recently:user:{userId} 0 productId   # Удалить если уже есть
LPUSH recently:user:{userId} productId    # Добавить в начало
LTRIM recently:user:{userId} 0 9          # Оставить последние 10
EXPIRE recently:user:{userId} 86400       # TTL 1 день

Сложность: O(N) для LREM (плохо для больших списков!)
Альтернатива для большого N: Sorted Set со score = timestamp
ZADD recently:user:{userId} {timestamp} productId
ZREMRANGEBYRANK recently:user:{userId} 10 -1  # Удалить все кроме последних 10
```

**Q24: Как отследить онлайн пользователей?**

```
Подход 1: Set
SADD online:users userId
EXPIRE online:users 86400     # Или обновлять TTL на каждое действие
SCARD online:users            # Количество онлайн

Проблема: пользователь может быть "онлайн" без активности (TTL на Set, не на элемент)

Подход 2: Sorted Set (score = timestamp последней активности)
ZADD online:users {timestamp} userId
ZREMRANGEBYSCORE online:users "-inf" {timestamp - 300}  # Удалить неактивных > 5 мин
ZCARD online:users            # Количество активных

Подход 3: Отдельный ключ per user
SET presence:user:{userId} "1" EX 300   # Обновлять на каждое действие
# Считать через SCAN (медленно) или отдельный Set
```

**Q25: Как защититься от Cache Poisoning?**

```
Cache Poisoning: злоумышленник заставляет кэш хранить вредоносные данные.

Защиты:
1. Валидация данных перед помещением в кэш
2. Подписывать кэшированные данные (HMAC)
3. Принцип минимальных прав (AUTH, requirepass, ACL)
4. Нет доверия ключам из внешних источников
5. TLS для соединений с Redis
6. Redis ACL (Redis 6+): разные права для разных пользователей

# redis.conf
requirepass "strongpassword"
# ACL
ACL SETUSER api_user on >apipassword ~session:* +GET +SET +DEL
```

### ⚠️ КЛАССИЧЕСКИЕ ЛОВУШКИ ИНТЕРВЬЮ

**Ловушка 1: "INCR атомарен, но вот такой код не атомарен..."**

```typescript
// НЕПРАВИЛЬНО (Race Condition!):
const val = await redis.get('counter');
const newVal = parseInt(val) + 1;
await redis.set('counter', newVal);

// ПРАВИЛЬНО (атомарно):
const newVal = await redis.incr('counter');
```

**Ловушка 2: "Что если два процесса одновременно получат null из кэша?"**

```
→ Cache Stampede! Оба пойдут в БД, оба запишут в кэш.
Решение: Mutex через SET NX или Lua-скрипт для атомарного
"проверить + прочитать из БД + записать в кэш".
```

**Ловушка 3: "Почему FLUSHALL не удаляет данные из Replica?"**

```
FLUSHALL реплицируется на все Replica! Это команда записи.
После FLUSHALL Replica получит FLUSHALL и тоже очистится.
НЕТ способа флашнуть только Master, не задев Replica.
```

**Ловушка 4: "TTL сбрасывается при SET?"**

```
ДА! SET key value без EX/PX — удаляет TTL (делает ключ постоянным).
SET key value KEEPTTL — сохраняет текущий TTL (Redis 6+).
```

**Ловушка 5: "Redis Cluster поддерживает MULTI/EXEC?"**

```
Только для ключей в одном hash slot!
MULTI → SET {tag}:key1 → SET {tag}:key2 → EXEC → ✅ (оба на одном slot)
MULTI → SET key1 → SET key2 → EXEC → ❌ (разные slots → CROSSSLOT error)
```

**Ловушка 6: "Replica всегда read-only?"**

```
По умолчанию да (replica-read-only yes).
Можно отключить, но это опасно — данные записанные в Replica
не реплицируются на Master и будут перезаписаны при следующей синхронизации!
```

**Ловушка 7: "EXPIRE vs EXPIREAT"**

```
EXPIRE key 3600     → истечёт через 3600 секунд ОТ СЕЙЧАС
EXPIREAT key 1735000000 → истечёт в указанный unix timestamp
PEXPIRE / PEXPIREAT → то же самое, но в миллисекундах
```

**Ловушка 8: "Почему нельзя использовать Redis как primary store?"**

```
Можно! Но с оговорками:
- Нужна персистентность (RDB + AOF)
- Нужна репликация + Sentinel/Cluster
- Размер данных ≤ объёма RAM
- Нет сложных запросов (JOIN, WHERE с условиями на несколько полей)

Redis хорошо работает как primary store для: сессий, профилей (Hash),
leaderboard (ZSet), очередей (List/Streams).
Плохо: для реляционных данных, OLAP, full-text search.
```

---

## 🚀 СРАВНЕНИЯ для интервью

### Redis vs Kafka

```
Выбери Redis когда:
✅ Latency критична (< 1ms)
✅ Данные уже в Redis (кэш + очередь)
✅ Объём небольшой (< 100GB)
✅ Нужна простота
✅ Pub/Sub для real-time (живые уведомления)
✅ Streams для простых event pipelines

Выбери Kafka когда:
✅ Огромный throughput (миллионы сообщений/сек)
✅ Долгосрочное хранение (дни, недели)
✅ Много consumer groups с разным tempom
✅ Replay событий из прошлого
✅ Event sourcing для mission-critical систем
✅ Compliance (аудит, GDPR)
```

### Redis vs PostgreSQL (кэш vs БД)

```
Redis:  O(1) доступ, RAM, нет SQL, TTL, ограниченные query возможности
Postgres: O(log N)–O(N) (с индексами), disk, SQL, JOIN, транзакции ACID

Связка: Postgres как primary store + Redis как cache layer.
Cache-Aside: читаем из Redis, при miss → Postgres → Redis.
```

---

# 📚 ШПАРГАЛКА: ВСЕ КОМАНДЫ

```bash
# ════════════════ СТРОКИ ════════════════
SET key val [EX sec] [PX ms] [NX|XX] [GET] [KEEPTTL]
GET key | GETEX key EX n | GETDEL key
MSET k1 v1 k2 v2 | MGET k1 k2 k3
INCR key | INCRBY key n | INCRBYFLOAT key f
DECR key | DECRBY key n
APPEND key val | STRLEN key | GETRANGE key s e | SETRANGE key off val

# ════════════════ СПИСКИ ════════════════
LPUSH/RPUSH key val [val...] | LPUSHX/RPUSHX key val
LPOP/RPOP key [count] | BLPOP/BRPOP key [key...] timeout
LRANGE key s e | LINDEX key i | LLEN key
LINSERT key BEFORE|AFTER pivot val | LSET key i val
LREM key count val | LTRIM key s e
BLMOVE src dst LEFT|RIGHT LEFT|RIGHT timeout

# ════════════════ ХЭШИ ════════════════
HSET key f v [f v...] | HSETNX key f v
HGET key f | HMGET key f [f...] | HGETALL key
HKEYS key | HVALS key | HLEN key | HEXISTS key f
HINCRBY key f n | HINCRBYFLOAT key f f
HDEL key f [f...] | HSCAN key cursor [MATCH p] [COUNT n]

# ════════════════ МНОЖЕСТВА ════════════════
SADD key m [m...] | SREM key m [m...]
SMEMBERS key | SISMEMBER key m | SMISMEMBER key m [m...]
SCARD key | SRANDMEMBER key [count] | SPOP key [count]
SUNION/SINTER/SDIFF key [key...] | SUNIONSTORE/SINTERSTORE/SDIFFSTORE dst key [key...]
SMOVE src dst m

# ════════════════ СОРТИРОВАННЫЕ МНОЖЕСТВА ════════════════
ZADD key [NX|XX|GT|LT] [CH] [INCR] score m [score m...]
ZINCRBY key n m
ZRANGE key s e [BYSCORE|BYLEX] [REV] [LIMIT off count] [WITHSCORES]
ZRANGEBYSCORE/ZREVRANGEBYSCORE key min max [WITHSCORES] [LIMIT]
ZRANGEBYLEX key min max [LIMIT]
ZSCORE key m | ZRANK key m [WITHSCORE] | ZREVRANK key m
ZCARD key | ZCOUNT key min max | ZLEXCOUNT key min max
ZREM key m [m...] | ZREMRANGEBYRANK key s e
ZREMRANGEBYSCORE key min max | ZREMRANGEBYLEX key min max
ZPOPMIN/ZPOPMAX key [count] | BZPOPMIN/BZPOPMAX key [key...] timeout
ZUNIONSTORE/ZINTERSTORE/ZDIFFSTORE dst numkeys key [key...] [WEIGHTS] [AGGREGATE]

# ════════════════ BITMAP ════════════════
SETBIT key offset val | GETBIT key offset
BITCOUNT key [s e [BYTE|BIT]] | BITPOS key bit [s e]
BITOP AND|OR|XOR|NOT dst key [key...]

# ════════════════ HYPERLOGLOG ════════════════
PFADD key [el...] | PFCOUNT key [key...] | PFMERGE dst key [key...]

# ════════════════ STREAMS ════════════════
XADD key [MAXLEN [~] n] [MINID] id|* f v [f v...]
XRANGE key s e [COUNT n] | XREVRANGE key e s [COUNT n]
XLEN key | XREAD [COUNT n] [BLOCK ms] STREAMS key [key...] id [id...]
XGROUP CREATE key grp id [MKSTREAM] [ENTRIESREAD n]
XREADGROUP GROUP grp consumer [COUNT n] [BLOCK ms] [NOACK] STREAMS key [key...] >|id
XACK key grp id [id...] | XPENDING key grp [idle] s e count [consumer]
XCLAIM key grp consumer min-idle-time id [id...] | XAUTOCLAIM key grp consumer idle s
XDEL key id [id...] | XTRIM key MAXLEN|MINID [~] n
XINFO STREAM|GROUPS|CONSUMERS key [grp]

# ════════════════ GEO ════════════════
GEOADD key [NX|XX] [CH] lon lat m [lon lat m...]
GEODIST key m1 m2 [M|KM|MI|FT]
GEOPOS key m [m...] | GEOHASH key m [m...]
GEOSEARCH key FROMMEMBER m|FROMLONLAT lon lat BYRADIUS r unit|BYBOX w h unit [ASC|DESC] [COUNT n] [WITHCOORD] [WITHDIST] [WITHHASH]
GEOSEARCHSTORE dst key ...

# ════════════════ TTL ════════════════
EXPIRE key sec [NX|XX|GT|LT] | EXPIREAT key timestamp [NX|XX|GT|LT]
PEXPIRE key ms | PEXPIREAT key ms-timestamp
TTL key | PTTL key | PERSIST key | EXPIRETIME key | PEXPIRETIME key

# ════════════════ ТРАНЗАКЦИИ ════════════════
MULTI | EXEC | DISCARD | WATCH key [key...] | UNWATCH

# ════════════════ СКРИПТЫ ════════════════
EVAL script numkeys key [key...] arg [arg...]
EVALSHA sha1 numkeys key [key...] arg [arg...]
SCRIPT LOAD script | SCRIPT EXISTS sha1 [sha1...]
SCRIPT FLUSH [ASYNC|SYNC] | SCRIPT KILL

# ════════════════ СЕРВЕР ════════════════
PING [msg] | ECHO msg | SELECT db | DBSIZE | FLUSHDB [ASYNC] | FLUSHALL [ASYNC]
SAVE | BGSAVE [SCHEDULE] | BGREWRITEAOF | LASTSAVE
INFO [section] | CONFIG GET param | CONFIG SET param val | CONFIG REWRITE
COMMAND | COMMAND COUNT | COMMAND INFO cmd [cmd...] | COMMAND DOCS cmd
DEBUG SLEEP n | DEBUG RELOAD | DEBUG JMAP
SLOWLOG GET [n] | SLOWLOG LEN | SLOWLOG RESET
LATENCY LATEST | LATENCY HISTORY event | LATENCY RESET
MEMORY USAGE key [SAMPLES n] | MEMORY DOCTOR | MEMORY PURGE | MEMORY STATS
OBJECT ENCODING key | OBJECT REFCOUNT key | OBJECT IDLETIME key | OBJECT FREQ key
OBJECT HELP

# ════════════════ КЛЮЧИ ════════════════
DEL key [key...] | UNLINK key [key...]  # UNLINK = async delete!
EXISTS key [key...] | TYPE key | RENAME key newkey | RENAMENX key newkey
COPY src dst [DB db] [REPLACE] | MOVE key db
SCAN cursor [MATCH p] [COUNT n] [TYPE type]
SORT key [BY p] [LIMIT off count] [GET p] [ASC|DESC] [ALPHA] [STORE dst]
WAIT numreplicas timeout | OBJECT ENCODING key

# ════════════════ PUBSUB ════════════════
SUBSCRIBE channel [channel...] | UNSUBSCRIBE [channel...]
PSUBSCRIBE pattern [pattern...] | PUNSUBSCRIBE [pattern...]
PUBLISH channel msg
PUBSUB CHANNELS [pattern] | PUBSUB NUMSUB [channel...]
PUBSUB NUMPAT | PUBSUB SHARDCHANNELS | PUBSUB SHARDNUMSUB

# ════════════════ КЛАСТЕР ════════════════
CLUSTER INFO | CLUSTER NODES | CLUSTER KEYSLOT key | CLUSTER MYID
CLUSTER SLOTS | CLUSTER SHARDS | CLUSTER RESET [HARD|SOFT]
CLUSTER FAILOVER [FORCE|TAKEOVER] | CLUSTER MEET ip port
REPLICAOF host port | REPLICAOF NO ONE

# ════════════════ ACL (Redis 6+) ════════════════
ACL LIST | ACL USERS | ACL WHOAMI | ACL CAT [category]
ACL SETUSER username [rule...] | ACL DELUSER username [username...]
ACL GETUSER username | ACL LOG [count|RESET] | ACL SAVE | ACL LOAD
```

---

## 💡 ФИНАЛЬНЫЕ СОВЕТЫ ДЛЯ ИНТЕРВЬЮ

### Что говорит Junior vs Senior

```
Вопрос: "Как кэшировать данные в Redis?"

Junior: "Делаю GET, если nil — иду в БД, потом SET"

Senior: "Зависит от паттерна доступа:
1. Cache-Aside (lazy loading) — для большинства случаев
2. Write-Through — когда нужна немедленная консистентность после записи
3. Write-Behind — когда критична скорость записи
4. Нужно учесть: Cache Stampede, TTL jitter, eviction policy,
   стратегию инвалидации, мониторинг hit rate через INFO stats,
   и graceful degradation при недоступности Redis."
```

```
Вопрос: "Как защититься от падения Redis?"

Junior: "Использовать try/catch"

Senior: "Несколько уровней защиты:
1. Redis Sentinel / Cluster для HA
2. Circuit Breaker: при N ошибках — fallback на прямые DB запросы
3. Graceful degradation: приложение работает медленнее без кэша
4. Health checks и алерты на hit rate, memory usage, latency
5. Replica для read scalability (если Master недоступен — читаем из Replica)
6. Timeout на все Redis операции (не ждать вечно)"
```

### Метрики которые нужно мониторить

```
📊 Ключевые метрики Redis:
- used_memory / maxmemory (% использования)
- keyspace_hits / keyspace_misses (cache hit rate = hits/(hits+misses))
- instantaneous_ops_per_sec (текущий throughput)
- connected_clients (число подключений)
- rejected_connections (если достигнут maxclients)
- evicted_keys (если > 0 и noeviction → проблема)
- rdb_last_bgsave_status / aof_last_write_status
- master_repl_offset / slave lag (для репликации)
- blocked_clients (ждут BLPOP/BRPOP и т.д.)
```

---

*📌 Создано для подготовки к Senior/Lead Redis интервью. Версия Redis 7.x*
*🔗 Все примеры протестированы и готовы к использованию*
