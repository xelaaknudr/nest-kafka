/**
 * redis-learn.controller.ts — RESERVATION SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🗺️ КАРТА ОБУЧЕНИЯ REDIS
 *
 * Каждый эндпоинт = одна концепция. Читай комментарий → дёргай эндпоинт → читай лог.
 * Все ключи используют формат: redis:learn:{concept}:{id}
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │  #  │ Маршрут                             │ Концепция                           │
 * ├─────┼─────────────────────────────────────┼─────────────────────────────────────┤
 * │  1  │ GET  /redis/learn/1-ping            │ PING, SET/GET — базовые операции    │
 * │  2  │ GET  /redis/learn/2-strings         │ Все строковые команды               │
 * │  3  │ GET  /redis/learn/3-lists           │ Списки: очередь и стек              │
 * │  4  │ GET  /redis/learn/4-hashes          │ Хэши: объект пользователя           │
 * │  5  │ GET  /redis/learn/5-sets            │ Множества: уникальные теги          │
 * │  6  │ GET  /redis/learn/6-sorted-sets     │ Сортированные множества: рейтинг    │
 * │  7  │ GET  /redis/learn/7-ttl-expiry      │ TTL: время жизни ключей             │
 * │  8  │ GET  /redis/learn/8-cache-aside     │ Cache-Aside: шаблон кэширования     │
 * │  9  │ POST /redis/learn/9-pipeline        │ Pipelining: батч-команды            │
 * │ 10  │ POST /redis/learn/10-transactions   │ MULTI/EXEC: транзакции              │
 * │ 11  │ POST /redis/learn/11-lua-script     │ EVAL: Lua-скрипты (атомарность)     │
 * │ 12  │ POST /redis/learn/12-distributed-lock│ Distributed Lock: SET NX EX       │
 * │ 13  │ POST /redis/learn/13-rate-limiter   │ Rate Limiting: фиксированное окно   │
 * │ 14  │ GET  /redis/learn/14-pub-sub        │ Pub/Sub: огонь и забудь             │
 * │ 15  │ GET  /redis/learn/15-hyperloglog    │ HyperLogLog: уникальные посетители  │
 * │ 16  │ GET  /redis/learn/16-bitmap         │ Bitmap: активные пользователи       │
 * │ 17  │ GET  /redis/learn/17-geospatial     │ Geo: ближайшие рестораны            │
 * │ 18  │ POST /redis/learn/18-session        │ Session: управление сессиями        │
 * │ 19  │ GET  /redis/learn/19-leaderboard    │ Leaderboard: топ-10 игроков         │
 * │ 20  │ GET  /redis/learn/20-memory-info    │ INFO: статистика и метрики          │
 * └─────┴─────────────────────────────────────┴─────────────────────────────────────┘
 *
 * 🚀 БЫСТРЫЙ СТАРТ:
 *   docker-compose up redis -d
 *   curl http://localhost:3000/redis/learn/1-ping
 *
 * 🔍 МОНИТОРИНГ:
 *   RedisInsight UI: http://localhost:5540
 *   redis-cli: docker exec -it redis redis-cli
 */

import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@app/common';

@Controller('redis/learn')
export class RedisLearnController {
  private readonly logger = new Logger(RedisLearnController.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 1: PING — Базовое подключение и SET/GET
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Что такое Redis и зачем он нужен
   *
   * Redis (Remote Dictionary Server) — это in-memory хранилище данных.
   * Работает в RAM → операции за O(1) или O(N), где N — количество элементов.
   * Скорость: 100 000+ операций в секунду на одном ядре.
   *
   * PING — команда проверки связи. Аналог TCP keepalive.
   * SET key value — сохранить строку. Самая базовая операция.
   * GET key — получить значение. Возвращает null если ключ не существует.
   *
   * ВАЖНО: Redis — однопоточный. Все команды выполняются строго последовательно.
   * Это даёт атомарность одиночных команд "из коробки".
   *
   * Команды Redis CLI:
   *   PING
   *   SET redis:learn:ping:hello "Hello Redis!"
   *   GET redis:learn:ping:hello
   *   KEYS redis:learn:ping:*
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Почему Redis быстрее PostgreSQL?"
   *   A: Данные в RAM (не на диске), однопоточность устраняет lock overhead,
   *      простые структуры данных без JOIN и индексов B-Tree.
   *
   * 📋 ЧТО СМОТРЕТЬ:
   *   RedisInsight → http://localhost:5540 → Keys → redis:learn:ping:*
   *
   * curl http://localhost:3000/redis/learn/1-ping
   */
  @Get('1-ping')
  async step1Ping() {
    // PING — базовая проверка соединения, всегда возвращает "PONG"
    const pong = await this.redis.ping();

    // SET без TTL — ключ живёт вечно пока его не удалят или не перезапустят Redis без persistence
    await this.redis.set('redis:learn:ping:hello', 'Hello Redis!');
    await this.redis.set(
      'redis:learn:ping:timestamp',
      new Date().toISOString(),
    );

    // GET — получить значение по ключу
    const hello = await this.redis.get('redis:learn:ping:hello');
    const timestamp = await this.redis.get('redis:learn:ping:timestamp');

    // TYPE — узнать тип структуры данных для ключа
    const keyType = await this.redis.type('redis:learn:ping:hello');

    // DBSIZE — количество ключей в текущей БД (db0 по умолчанию)
    const dbSize = await this.redis.dbsize();

    // Очистка демонстрационных ключей
    await this.redis.del(
      'redis:learn:ping:hello',
      'redis:learn:ping:timestamp',
    );

    this.logger.log(`[STEP-1] PING=${pong}, dbSize=${dbSize}`);

    return {
      step: 1,
      concept: 'PING, SET, GET — базовые операции',
      commands: ['PING', 'SET key value', 'GET key', 'TYPE key', 'DBSIZE'],
      results: {
        ping: pong,
        hello,
        timestamp,
        keyType,
        dbSize,
      },
      nextStep: 'GET /redis/learn/2-strings — все строковые команды',
      redisCli: [
        'docker exec -it redis redis-cli PING',
        'docker exec -it redis redis-cli SET test "hello"',
        'docker exec -it redis redis-cli GET test',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 2: STRINGS — Все строковые команды
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Строки (Strings) в Redis
   *
   * String — самый базовый тип данных. Может хранить:
   *   - Текст (до 512 MB)
   *   - Числа (INCR/DECR работают атомарно!)
   *   - Бинарные данные (изображения, сериализованные объекты)
   *
   * Атомарный инкремент — ключевая особенность. В отличие от:
   *   count++ в Node.js (не атомарно при concurrent доступе)
   *   UPDATE SET count = count + 1 в SQL (требует транзакцию)
   *   Redis INCR — атомарен "из коробки" (однопоточность)
   *
   * SETNX (SET if Not eXists) — устанавливает значение только если ключ НЕ существует.
   * Используется для distributed locks (Шаг 12).
   *
   * Команды Redis CLI:
   *   SET redis:learn:str:counter 0
   *   INCR redis:learn:str:counter
   *   INCRBY redis:learn:str:counter 10
   *   APPEND redis:learn:str:greeting " World"
   *   GETRANGE redis:learn:str:greeting 0 4
   *   MGET redis:learn:str:k1 redis:learn:str:k2
   *   SETNX redis:learn:str:lock "owner-1"
   *   STRLEN redis:learn:str:greeting
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как Redis реализует атомарный инкремент?"
   *   A: Redis однопоточный — команды выполняются строго по одной, поэтому
   *      INCR не требует никаких блокировок. Это принципиальное отличие от
   *      многопоточных систем где нужны mutex/semaphore.
   *
   * curl http://localhost:3000/redis/learn/2-strings
   */
  @Get('2-strings')
  async step2Strings() {
    const prefix = 'redis:learn:str';

    // SET с различными опциями
    await this.redis.set(`${prefix}:greeting`, 'Hello');
    await this.redis.set(`${prefix}:counter`, '0');

    // INCR — атомарный инкремент на 1. Если ключ не существует — создаёт со значением 1
    const afterIncr1 = await this.redis.incr(`${prefix}:counter`);
    const afterIncr2 = await this.redis.incr(`${prefix}:counter`);

    // INCRBY — инкремент на произвольное число
    const afterIncrBy = await this.redis.incrby(`${prefix}:counter`, 10);

    // DECR / DECRBY — декремент
    const afterDecr = await this.redis.decr(`${prefix}:counter`);

    // APPEND — добавить строку к существующей. Возвращает новую длину
    const newLen = await this.redis.append(
      `${prefix}:greeting`,
      ' Redis World!',
    );

    // GETRANGE — подстрока (включительно оба конца)
    const substring = await this.redis.getrange(`${prefix}:greeting`, 0, 4);

    // STRLEN — длина строки
    const strlen = await this.redis.strlen(`${prefix}:greeting`);

    // Читаем итоговое значение
    const greeting = await this.redis.get(`${prefix}:greeting`);
    const counter = await this.redis.get(`${prefix}:counter`);

    // MSET — установить несколько ключей за одну команду (атомарно)
    await this.redis.mset(
      `${prefix}:k1`,
      'value1',
      `${prefix}:k2`,
      'value2',
      `${prefix}:k3`,
      'value3',
    );

    // MGET — получить несколько ключей за одну команду
    const multiValues = await this.redis.mget(
      `${prefix}:k1`,
      `${prefix}:k2`,
      `${prefix}:k3`,
    );

    // SETNX — SET if Not eXists (0 = не установлен, 1 = установлен)
    const setnxFirst = await this.redis.setnx(`${prefix}:lock`, 'owner-1');
    const setnxSecond = await this.redis.setnx(`${prefix}:lock`, 'owner-2'); // НЕ перезапишет!
    const lockOwner = await this.redis.get(`${prefix}:lock`);

    // SET с EX (TTL) и NX одновременно — основа distributed lock
    const setNxEx = await this.redis.set(
      `${prefix}:dist-lock`,
      'worker-1',
      'EX',
      10,
      'NX',
    );

    // Очистка
    await this.redis.del(
      `${prefix}:greeting`,
      `${prefix}:counter`,
      `${prefix}:k1`,
      `${prefix}:k2`,
      `${prefix}:k3`,
      `${prefix}:lock`,
      `${prefix}:dist-lock`,
    );

    this.logger.log(
      `[STEP-2] Strings: counter=${afterIncrBy}, greeting len=${newLen}`,
    );

    return {
      step: 2,
      concept: 'Strings — SET, GET, INCR, DECR, APPEND, GETRANGE, MGET, SETNX',
      commands: [
        'SET',
        'GET',
        'INCR',
        'INCRBY',
        'DECR',
        'APPEND',
        'GETRANGE',
        'STRLEN',
        'MSET',
        'MGET',
        'SETNX',
      ],
      results: {
        atomicIncrement: { afterIncr1, afterIncr2, afterIncrBy, afterDecr },
        stringOps: { greeting, counter, newLen, substring, strlen },
        mget: {
          keys: [`${prefix}:k1`, `${prefix}:k2`, `${prefix}:k3`],
          values: multiValues,
        },
        setnx: {
          firstAttempt: setnxFirst === 1 ? 'Установлен ✅' : 'Не установлен ❌',
          secondAttempt:
            setnxSecond === 1
              ? 'Установлен ✅'
              : 'Не установлен (уже занят) ❌',
          actualOwner: lockOwner,
        },
        distributedLockResult: setNxEx,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 3: LISTS — Очереди и стеки
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Списки (Lists) в Redis
   *
   * List — связный список строк. Может работать как:
   *   СТЕК (LIFO): LPUSH + LPOP (добавляем и берём слева)
   *   ОЧЕРЕДЬ (FIFO): RPUSH + LPOP (добавляем справа, берём слева)
   *   ДЭКА: комбинация LPUSH/RPUSH/LPOP/RPOP
   *
   * Типичные use-cases:
   *   📋 Очередь задач (job queue) — RPUSH задачи, воркер делает BLPOP
   *   📜 Последние N действий пользователя — LPUSH + LTRIM
   *   📰 Лента новостей — LPUSH новые записи, LRANGE для чтения страницы
   *   🔔 Очередь уведомлений
   *
   * BRPOP/BLPOP — блокирующие варианты. Воркер ждёт задачу вместо polling-а.
   * Это основа простых систем очередей без дополнительных брокеров.
   *
   * Команды Redis CLI:
   *   RPUSH redis:learn:list:queue "task1" "task2" "task3"
   *   LPOP redis:learn:list:queue
   *   LRANGE redis:learn:list:queue 0 -1
   *   LLEN redis:learn:list:queue
   *   LPUSH redis:learn:list:stack "a" "b" "c"
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Чем Redis List отличается от Kafka?"
   *   A: Redis List — нет persistence группировки по consumer groups,
   *      нет offset (consumed элемент удаляется), нет replay.
   *      Kafka — persistent log с offset, consumer groups, replay.
   *      Для простых задач Redis List проще и быстрее.
   *
   * curl http://localhost:3000/redis/learn/3-lists
   */
  @Get('3-lists')
  async step3Lists() {
    const queueKey = 'redis:learn:list:queue';
    const stackKey = 'redis:learn:list:stack';
    const historyKey = 'redis:learn:list:history';

    // ─── Паттерн: ОЧЕРЕДЬ (FIFO) ──────────────────────────────────────────
    // RPUSH — добавляем задачи в конец очереди
    await this.redis.rpush(queueKey, 'task:email-confirmation');
    await this.redis.rpush(queueKey, 'task:resize-avatar');
    await this.redis.rpush(queueKey, 'task:send-notification');

    const queueLen = await this.redis.llen(queueKey);
    // LRANGE 0 -1 — получить весь список (0=начало, -1=конец)
    const queueBefore = await this.redis.lrange(queueKey, 0, -1);
    // LPOP — воркер берёт задачу из начала (FIFO)
    const processedTask = await this.redis.lpop(queueKey);
    const queueAfter = await this.redis.lrange(queueKey, 0, -1);

    // ─── Паттерн: СТЕК (LIFO) ─────────────────────────────────────────────
    // LPUSH — добавляем в начало (новые элементы наверху)
    await this.redis.lpush(stackKey, 'page:home');
    await this.redis.lpush(stackKey, 'page:profile');
    await this.redis.lpush(stackKey, 'page:settings'); // Последняя посещённая страница

    const stack = await this.redis.lrange(stackKey, 0, -1);
    // LPOP — берём последний добавленный (LIFO)
    const lastPage = await this.redis.lpop(stackKey);

    // ─── Паттерн: Последние N действий (LPUSH + LTRIM) ───────────────────
    for (let i = 1; i <= 7; i++) {
      await this.redis.lpush(
        historyKey,
        `action:${i}:${new Date().toISOString()}`,
      );
    }
    // LTRIM — оставить только первые 5 элементов (история последних 5 действий)
    await this.redis.ltrim(historyKey, 0, 4);
    const last5Actions = await this.redis.lrange(historyKey, 0, -1);

    // Очистка
    await this.redis.del(queueKey, stackKey, historyKey);

    this.logger.log(
      `[STEP-3] Lists: queue processed "${processedTask}", stack top "${lastPage}"`,
    );

    return {
      step: 3,
      concept: 'Lists — LPUSH, RPUSH, LRANGE, LPOP, RPOP, LLEN, LTRIM',
      commands: ['RPUSH', 'LPUSH', 'LPOP', 'RPOP', 'LRANGE', 'LLEN', 'LTRIM'],
      patterns: {
        queue: {
          description: 'FIFO очередь задач (RPUSH + LPOP)',
          before: { length: queueLen, items: queueBefore },
          processedTask,
          after: queueAfter,
        },
        stack: {
          description: 'LIFO стек навигации (LPUSH + LPOP)',
          items: stack,
          popped: lastPage,
        },
        recentHistory: {
          description: 'Последние 5 действий пользователя (LPUSH + LTRIM)',
          items: last5Actions,
        },
      },
      interviewTip:
        'BLPOP — блокирующий POP. Воркер спит пока нет задач → 0 CPU usage при idle',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 4: HASHES — Объект пользователя в Redis
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Хэши (Hashes) в Redis
   *
   * Hash — это map/словарь из строковых пар field:value.
   * Идеально для хранения объектов (пользователь, сессия, товар).
   *
   * Почему Hash лучше чем JSON в строке?
   *   JSON String: GET user:1 → парсим весь JSON → меняем одно поле → SET user:1
   *   Hash: HGET user:1 email → только нужное поле, HSET user:1 email new@mail.com
   *
   * Hash vs множество String ключей:
   *   user:1:name, user:1:email — много ключей, накладные расходы на хранение
   *   Hash user:1 → один ключ, поля хранятся компактно (ziplist при < 128 полей)
   *
   * Команды Redis CLI:
   *   HSET redis:learn:hash:user:1 name "Alice" email "alice@example.com" age "28"
   *   HGET redis:learn:hash:user:1 email
   *   HGETALL redis:learn:hash:user:1
   *   HDEL redis:learn:hash:user:1 age
   *   HKEYS redis:learn:hash:user:1
   *   HVALS redis:learn:hash:user:1
   *   HINCRBY redis:learn:hash:user:1 loginCount 1
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как хранить объект пользователя в Redis?"
   *   A: Hash — лучший вариант для изменяемых объектов.
   *      JSON String — если читаешь всегда целиком и объект маленький.
   *      Никогда не используй отдельные ключи на каждое поле — overhead памяти.
   *
   * curl http://localhost:3000/redis/learn/4-hashes
   */
  @Get('4-hashes')
  async step4Hashes() {
    const userKey = 'redis:learn:hash:user:42';
    const sessionKey = 'redis:learn:hash:session:abc123';

    // ─── HSET: установить одно или несколько полей ────────────────────────
    // В ioredis HSET принимает объект для множественной установки полей
    await this.redis.hset(userKey, {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      age: '28',
      role: 'admin',
      loginCount: '0',
      createdAt: new Date().toISOString(),
    });

    // HGET — получить одно конкретное поле (экономия трафика vs HGETALL)
    const email = await this.redis.hget(userKey, 'email');
    const role = await this.redis.hget(userKey, 'role');

    // HGETALL — получить все поля и значения объекта
    const user = await this.redis.hgetall(userKey);

    // HINCRBY — атомарно инкрементировать числовое поле
    const newLoginCount = await this.redis.hincrby(userKey, 'loginCount', 1);
    await this.redis.hincrby(userKey, 'loginCount', 1); // ещё раз

    // HKEYS — только имена полей
    const fields = await this.redis.hkeys(userKey);

    // HVALS — только значения
    const values = await this.redis.hvals(userKey);

    // HEXISTS — проверить существование поля
    const hasEmail = await this.redis.hexists(userKey, 'email');
    const hasPhone = await this.redis.hexists(userKey, 'phone'); // не существует

    // HDEL — удалить конкретное поле
    await this.redis.hdel(userKey, 'age');
    const afterDel = await this.redis.hgetall(userKey);

    // HLEN — количество полей в хэше
    const fieldCount = await this.redis.hlen(userKey);

    // ─── Паттерн: Сессия пользователя ────────────────────────────────────
    await this.redis.hset(sessionKey, {
      userId: '42',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
    });
    // TTL на сессию — 30 минут
    await this.redis.expire(sessionKey, 1800);

    const session = await this.redis.hgetall(sessionKey);
    const sessionTtl = await this.redis.ttl(sessionKey);

    // Обновить lastAccessAt (refresh TTL)
    await this.redis.hset(sessionKey, 'lastAccessAt', new Date().toISOString());
    await this.redis.expire(sessionKey, 1800); // сброс таймера

    // Очистка
    await this.redis.del(userKey, sessionKey);

    this.logger.log(
      `[STEP-4] Hash: user ${user.name}, loginCount=${newLoginCount}, fields=${fieldCount}`,
    );

    return {
      step: 4,
      concept:
        'Hashes — HSET, HGET, HGETALL, HDEL, HKEYS, HVALS, HINCRBY, HEXISTS, HLEN',
      commands: [
        'HSET',
        'HGET',
        'HGETALL',
        'HDEL',
        'HKEYS',
        'HVALS',
        'HINCRBY',
        'HEXISTS',
        'HLEN',
      ],
      results: {
        user: {
          initial: user,
          selectedField: { email, role },
          afterIncrBy: { loginCount: newLoginCount },
          fields,
          exists: { email: hasEmail === 1, phone: hasPhone === 1 },
          afterDeleteAge: afterDel,
          fieldCount,
        },
        session: {
          data: session,
          ttlSeconds: sessionTtl,
        },
      },
      interviewTip:
        'HSET с несколькими полями — атомарно. Используй вместо множества отдельных HSET вызовов.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 5: SETS — Уникальные коллекции
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Множества (Sets) в Redis
   *
   * Set — неупорядоченная коллекция уникальных строк.
   * Добавление дубликата игнорируется (не ошибка, просто не добавляется).
   * Проверка принадлежности — O(1) (хэш таблица внутри).
   *
   * Типичные use-cases:
   *   👤 Уникальные пользователи за день (SADD user-id, SCARD = количество уникальных)
   *   🏷️ Теги статьи: SADD article:42:tags "redis" "backend" "db"
   *   🚫 Чёрный список IP-адресов: SISMEMBER blacklist "1.2.3.4"
   *   👥 Общие друзья: SINTER user:1:friends user:2:friends
   *   📊 Рекомендации: SDIFF (что есть у другого, но нет у тебя)
   *
   * Команды Redis CLI:
   *   SADD redis:learn:set:tags "redis" "backend" "database"
   *   SMEMBERS redis:learn:set:tags
   *   SISMEMBER redis:learn:set:tags "redis"
   *   SCARD redis:learn:set:tags
   *   SUNION redis:learn:set:tags redis:learn:set:tags2
   *   SINTER redis:learn:set:tags redis:learn:set:tags2
   *   SDIFF redis:learn:set:tags redis:learn:set:tags2
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как найти общих подписчиков между двумя пользователями?"
   *   A: SINTER user:1:following user:2:following — одна атомарная операция в Redis.
   *      В SQL это JOIN или подзапрос. Redis делает это за O(N) где N=min(|S1|, |S2|).
   *
   * curl http://localhost:3000/redis/learn/5-sets
   */
  @Get('5-sets')
  async step5Sets() {
    const tagsKey1 = 'redis:learn:set:article:1:tags';
    const tagsKey2 = 'redis:learn:set:article:2:tags';
    const onlineKey = 'redis:learn:set:online-users';
    const blacklistKey = 'redis:learn:set:ip-blacklist';

    // ─── Теги статей ──────────────────────────────────────────────────────
    // SADD — добавить элементы (возвращает количество ДОБАВЛЕННЫХ, не дублей)
    const added1 = await this.redis.sadd(
      tagsKey1,
      'redis',
      'backend',
      'database',
      'nosql',
      'caching',
    );
    const added2 = await this.redis.sadd(
      tagsKey2,
      'redis',
      'backend',
      'microservices',
      'docker',
      'kubernetes',
    );

    // Попытка добавить дубликат
    const duplicateResult = await this.redis.sadd(tagsKey1, 'redis'); // Уже есть → вернёт 0

    // SMEMBERS — все элементы множества
    const tags1 = await this.redis.smembers(tagsKey1);
    const tags2 = await this.redis.smembers(tagsKey2);

    // SCARD — количество элементов (мощность множества)
    const count1 = await this.redis.scard(tagsKey1);

    // SISMEMBER — O(1) проверка принадлежности
    const hasRedis = await this.redis.sismember(tagsKey1, 'redis');
    const hasPython = await this.redis.sismember(tagsKey1, 'python');

    // SUNION — объединение: всё что есть хотя бы в одном
    const union = await this.redis.sunion(tagsKey1, tagsKey2);

    // SINTER — пересечение: только общие теги
    const intersection = await this.redis.sinter(tagsKey1, tagsKey2);

    // SDIFF — разность: есть в первом, но нет во втором
    const difference = await this.redis.sdiff(tagsKey1, tagsKey2);

    // ─── Онлайн-пользователи ─────────────────────────────────────────────
    await this.redis.sadd(
      onlineKey,
      'user:1',
      'user:2',
      'user:3',
      'user:5',
      'user:7',
    );
    await this.redis.expire(onlineKey, 300); // 5 минут
    const onlineCount = await this.redis.scard(onlineKey);
    const isUser3Online = await this.redis.sismember(onlineKey, 'user:3');

    // ─── Чёрный список IP ─────────────────────────────────────────────────
    await this.redis.sadd(
      blacklistKey,
      '192.168.1.100',
      '10.0.0.1',
      '172.16.0.50',
    );
    const isBanned = await this.redis.sismember(blacklistKey, '192.168.1.100');
    const isClean = await this.redis.sismember(blacklistKey, '8.8.8.8');

    // Очистка
    await this.redis.del(tagsKey1, tagsKey2, onlineKey, blacklistKey);

    this.logger.log(
      `[STEP-5] Sets: union=${union.length}, intersection=${intersection.length}`,
    );

    return {
      step: 5,
      concept: 'Sets — SADD, SMEMBERS, SISMEMBER, SCARD, SUNION, SINTER, SDIFF',
      commands: [
        'SADD',
        'SMEMBERS',
        'SISMEMBER',
        'SCARD',
        'SUNION',
        'SINTER',
        'SDIFF',
      ],
      results: {
        tags: {
          article1: { tags: tags1, count: count1, addedCount: added1 },
          article2: { tags: tags2 },
          duplicateAdd: `SADD "redis" второй раз вернул: ${duplicateResult} (0 = не добавлен)`,
          membership: { hasRedis: hasRedis === 1, hasPython: hasPython === 1 },
          setOperations: {
            union: { description: 'SUNION: всё из обоих', result: union },
            intersection: {
              description: 'SINTER: только общие',
              result: intersection,
            },
            difference: {
              description: 'SDIFF: есть в 1-й, нет во 2-й',
              result: difference,
            },
          },
        },
        onlineUsers: { count: onlineCount, isUser3Online: isUser3Online === 1 },
        blacklist: {
          isBanned192: isBanned === 1,
          isClean88: isClean === 1,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 6: SORTED SETS — Рейтинги и рейтинг-листы
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Сортированные множества (Sorted Sets / ZSets)
   *
   * Sorted Set — это Set, где каждый элемент имеет числовой score (очко).
   * Элементы всегда отсортированы по score (по возрастанию).
   * Уникальность — по member (строке), score может повторяться.
   *
   * Внутренняя реализация — Skip List + Hash Table:
   *   Skip List → быстрые операции по диапазону O(log N)
   *   Hash Table → быстрый ZSCORE и ZRANK O(1)
   *
   * Типичные use-cases:
   *   🏆 Leaderboard: ZADD game:scores 9500 "player:alice"
   *   📈 Trending: score = количество упоминаний за последний час
   *   🕐 Delayed Queue: score = UNIX timestamp когда выполнить задачу
   *   📅 Расписание: ZRANGEBYSCORE tasks 0 (currentTimestamp)
   *
   * Команды Redis CLI:
   *   ZADD redis:learn:zset:scores 9500 "alice" 8200 "bob" 7800 "charlie"
   *   ZRANGE redis:learn:zset:scores 0 -1 WITHSCORES
   *   ZREVRANGE redis:learn:zset:scores 0 2 WITHSCORES
   *   ZSCORE redis:learn:zset:scores "alice"
   *   ZRANK redis:learn:zset:scores "charlie"
   *   ZINCRBY redis:learn:zset:scores 500 "charlie"
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как получить топ-10 игроков с их позицией?"
   *   A: ZREVRANGE leaderboard 0 9 WITHSCORES — O(log N + 10).
   *      Для позиции конкретного игрока: ZREVRANK leaderboard "player" — O(log N).
   *      Всё это без дополнительных индексов, атомарно и очень быстро.
   *
   * curl http://localhost:3000/redis/learn/6-sorted-sets
   */
  @Get('6-sorted-sets')
  async step6SortedSets() {
    const leaderKey = 'redis:learn:zset:leaderboard';
    const trendKey = 'redis:learn:zset:trending';

    // ZADD — добавить элемент с очком
    await this.redis.zadd(leaderKey, 9500, 'player:alice');
    await this.redis.zadd(leaderKey, 8200, 'player:bob');
    await this.redis.zadd(leaderKey, 7800, 'player:charlie');
    await this.redis.zadd(leaderKey, 12100, 'player:diana');
    await this.redis.zadd(leaderKey, 6500, 'player:eve');

    // ZRANGE — от меньшего к большему (0=1-е место по возрастанию)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ascendingAll = await (this.redis as any).zrange(
      leaderKey,
      0,
      -1,
      'WITHSCORES',
    );

    // ZREVRANGE — от большего к меньшему (реальный рейтинг: 1-е место = наибольший score)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const top3 = await (this.redis as any).zrevrange(
      leaderKey,
      0,
      2,
      'WITHSCORES',
    );

    // ZSCORE — очки конкретного игрока
    const aliceScore = await this.redis.zscore(leaderKey, 'player:alice');

    // ZRANK — позиция по возрастанию (0-based)
    const aliceRankAsc = await this.redis.zrank(leaderKey, 'player:alice');

    // ZREVRANK — позиция по убыванию (0 = 1-е место)
    const dianaRank = await this.redis.zrevrank(leaderKey, 'player:diana'); // должно быть 0

    // ZINCRBY — увеличить очки (атомарно!)
    const newScore = await this.redis.zincrby(
      leaderKey,
      1000,
      'player:charlie',
    );

    // ZRANGEBYSCORE — все игроки с очками от 8000 до 10000
    const midTier = await this.redis.zrangebyscore(leaderKey, 8000, 10000);

    // ZCARD — количество элементов
    const totalPlayers = await this.redis.zcard(leaderKey);

    // ─── Паттерн: Trending (отложенная очередь) ───────────────────────────
    const now = Date.now();
    // score = UNIX timestamp когда нужно выполнить задачу
    await this.redis.zadd(trendKey, now + 5000, 'task:send-email');
    await this.redis.zadd(trendKey, now + 1000, 'task:resize-image');
    await this.redis.zadd(trendKey, now + 3000, 'task:generate-report');

    // Задачи готовые к выполнению: score <= now
    // (в реальности воркер делает ZRANGEBYSCORE key 0 (currentTimestamp))
    const readyTasks = await this.redis.zrangebyscore(trendKey, 0, now);

    // Очистка
    await this.redis.del(leaderKey, trendKey);

    this.logger.log(
      `[STEP-6] ZSet: diana rank=${dianaRank}, charlie new score=${newScore}`,
    );

    return {
      step: 6,
      concept:
        'Sorted Sets — ZADD, ZRANGE, ZREVRANGE, ZSCORE, ZRANK, ZRANGEBYSCORE, ZINCRBY',
      commands: [
        'ZADD',
        'ZRANGE',
        'ZREVRANGE',
        'ZSCORE',
        'ZRANK',
        'ZREVRANK',
        'ZRANGEBYSCORE',
        'ZINCRBY',
        'ZCARD',
      ],
      results: {
        leaderboard: {
          allAscending: ascendingAll,
          top3Descending: top3,
          players: { totalPlayers },
          alice: { score: aliceScore, rankAscending: aliceRankAsc },
          diana: { rank: dianaRank, note: 'ZREVRANK 0 = 1-е место' },
          charlie: { newScoreAfterIncrBy1000: newScore },
          midTierPlayers: { range: '8000-10000', players: midTier },
        },
        delayedQueue: {
          description:
            'score = UNIX timestamp → ZRANGEBYSCORE 0 now() = готовые задачи',
          readyNow: readyTasks,
          note:
            readyTasks.length === 0
              ? 'Все задачи в будущем (score > now)'
              : readyTasks,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 7: TTL / EXPIRY — Время жизни ключей
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: TTL (Time To Live) — время жизни ключей
   *
   * Каждый ключ в Redis может иметь TTL — количество секунд до автоматического удаления.
   * По умолчанию ключи живут вечно (TTL = -1).
   *
   * Как Redis удаляет истёкшие ключи:
   *   LAZY EXPIRY: при попытке GET истёкшего ключа → удаляет и возвращает nil
   *   ACTIVE EXPIRY: фоновый процесс каждые 100ms проверяет ~20 случайных ключей
   *
   * Это значит: истёкший ключ занимает память до момента следующего обращения!
   *
   * TTL возвращает:
   *   > 0  — секунд до истечения
   *   -1   — ключ существует, без TTL (вечный)
   *   -2   — ключ не существует
   *
   * Команды Redis CLI:
   *   SET redis:learn:ttl:demo "temporary" EX 30
   *   TTL redis:learn:ttl:demo
   *   PTTL redis:learn:ttl:demo
   *   PERSIST redis:learn:ttl:demo
   *   EXPIREAT redis:learn:ttl:unix (unix timestamp)
   *   TTL redis:learn:ttl:noexpiry
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Что вернёт TTL для несуществующего ключа и для ключа без истечения?"
   *   A: Несуществующий → -2. Существующий без TTL → -1. Это разные случаи!
   *      Многие разработчики путают -1 и -2.
   *
   * curl http://localhost:3000/redis/learn/7-ttl-expiry
   */
  @Get('7-ttl-expiry')
  async step7TtlExpiry() {
    const shortKey = 'redis:learn:ttl:short';
    const longKey = 'redis:learn:ttl:long';
    const persistKey = 'redis:learn:ttl:persist';
    const noTtlKey = 'redis:learn:ttl:eternal';

    // SET с EX — TTL в секундах
    await this.redis.set(shortKey, 'я исчезну через 5 секунд', 'EX', 5);

    // SET с PX — TTL в миллисекундах (для точных временных окон)
    await this.redis.set(longKey, 'я живу 1 час', 'EX', 3600);

    // Ключ без TTL
    await this.redis.set(noTtlKey, 'я вечный');

    // TTL — секунды до истечения
    const shortTtl = await this.redis.ttl(shortKey);

    // PTTL — миллисекунды до истечения (более точно)
    const longPttl = await this.redis.pttl(longKey);

    // TTL для вечного ключа → должно быть -1
    const eternalTtl = await this.redis.ttl(noTtlKey);

    // TTL для несуществующего ключа → должно быть -2
    const missingTtl = await this.redis.ttl('redis:learn:ttl:nonexistent');

    // EXPIRE — установить TTL для уже существующего ключа
    await this.redis.set(persistKey, 'сначала без TTL');
    const ttlBefore = await this.redis.ttl(persistKey); // -1
    await this.redis.expire(persistKey, 60);
    const ttlAfter = await this.redis.ttl(persistKey); // 60

    // PERSIST — убрать TTL (сделать ключ вечным)
    await this.redis.persist(persistKey);
    const ttlAfterPersist = await this.redis.ttl(persistKey); // -1 снова

    // EXPIREAT — установить TTL до конкретного UNIX timestamp
    const futureTimestamp = Math.floor(Date.now() / 1000) + 120; // через 2 минуты
    await this.redis.expireat(longKey, futureTimestamp);
    const ttlFromAt = await this.redis.ttl(longKey);

    // Очистка
    await this.redis.del(shortKey, longKey, persistKey, noTtlKey);

    this.logger.log(
      `[STEP-7] TTL: short=${shortTtl}s, eternal=${eternalTtl}, missing=${missingTtl}`,
    );

    return {
      step: 7,
      concept: 'TTL — EXPIRE, EXPIREAT, TTL, PTTL, PERSIST',
      commands: [
        'SET ... EX',
        'SET ... PX',
        'EXPIRE',
        'EXPIREAT',
        'TTL',
        'PTTL',
        'PERSIST',
      ],
      results: {
        shortLivedKey: { ttlSeconds: shortTtl, note: 'SET key value EX 5' },
        longLivedKey: { pttlMs: longPttl, afterExpireat: ttlFromAt },
        eternalKey: {
          ttl: eternalTtl,
          meaning: '-1 = ключ существует, но без TTL',
        },
        missingKey: { ttl: missingTtl, meaning: '-2 = ключ не существует' },
        persistDemo: {
          before: ttlBefore,
          afterExpire: ttlAfter,
          afterPersist: ttlAfterPersist,
          note: 'PERSIST убирает TTL → ключ становится вечным',
        },
      },
      interviewTip: [
        'TTL -1 = существует, вечный. TTL -2 = не существует. Не путай!',
        'Redis не гарантирует мгновенное удаление. Используй lazy + active expiry.',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 8: CACHE-ASIDE — Шаблон кэширования
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Cache-Aside (Lazy Loading) — самый популярный паттерн кэширования
   *
   * Алгоритм:
   *   1. ЗАПРОС: Приложение проверяет кэш (GET key)
   *   2. CACHE HIT: Данные в кэше → вернуть немедленно (< 1ms)
   *   3. CACHE MISS: Данных нет → загрузить из БД → сохранить в кэш → вернуть
   *
   * Почему "Lazy"? Кэш заполняется по мере обращений, не заранее.
   *
   * Проблема: Cache Stampede (Thundering Herd)
   *   При cache miss 1000 запросов одновременно идут в БД!
   *   Решение: Mutex (заблокировать остальные на время загрузки)
   *   или Probabilistic Early Expiration
   *
   * Альтернативы Cache-Aside:
   *   Write-Through: пишем в БД + кэш одновременно (всегда свежо, но медленнее запись)
   *   Read-Through: кэш сам загружает из БД при miss (сложнее реализовать)
   *   Write-Behind: пишем в кэш, фоном синхронизируем с БД (риск потери данных)
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как избежать cache stampede?"
   *   A: 1. Mutex lock перед загрузкой из БД (только один запрос грузит)
   *      2. Stale-while-revalidate: отдаём старые данные пока обновляем
   *      3. Jitter: случайный разброс TTL (не все ключи истекают одновременно)
   *
   * curl http://localhost:3000/redis/learn/8-cache-aside
   */
  @Get('8-cache-aside')
  async step8CacheAside() {
    const productKey = 'redis:learn:cache:product:123';
    const CACHE_TTL = 60; // 60 секунд

    // ─── Симуляция загрузки из "БД" ──────────────────────────────────────
    const loadFromDatabase = async (id: string) => {
      // Имитируем задержку БД запроса
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        id,
        name: 'Redis Best Practices Book',
        price: 2999,
        stock: 42,
        category: 'Books',
        loadedAt: new Date().toISOString(),
      };
    };

    // ─── Первый запрос: CACHE MISS ────────────────────────────────────────
    const startMiss = Date.now();

    const cachedMiss = await this.redis.get(productKey);
    let product: Record<string, unknown>;
    let firstRequestSource: string;

    if (cachedMiss === null) {
      // Cache Miss: загружаем из "БД"
      firstRequestSource = 'DATABASE (cache miss)';
      const dbData = await loadFromDatabase('123');
      product = dbData;
      // Сохраняем в кэш с TTL
      await this.redis.set(productKey, JSON.stringify(dbData), 'EX', CACHE_TTL);
    } else {
      firstRequestSource = 'CACHE (cache hit)';
      product = JSON.parse(cachedMiss);
    }

    const missDuration = Date.now() - startMiss;

    // ─── Второй запрос: CACHE HIT ─────────────────────────────────────────
    const startHit = Date.now();

    const cachedHit = await this.redis.get(productKey);
    let secondProduct: Record<string, unknown>;
    let secondRequestSource: string;

    if (cachedHit === null) {
      secondRequestSource = 'DATABASE';
      secondProduct = await loadFromDatabase('123');
    } else {
      secondRequestSource = 'CACHE (cache hit ✅)';
      secondProduct = JSON.parse(cachedHit);
    }

    const hitDuration = Date.now() - startHit;
    const remainingTtl = await this.redis.ttl(productKey);

    // ─── Cache Invalidation: когда нужно сбросить кэш ────────────────────
    // Например, после обновления товара в БД
    const deleteResult = await this.redis.del(productKey);

    // После удаления — следующий запрос снова будет cache miss
    const afterInvalidation = await this.redis.get(productKey);

    this.logger.log(
      `[STEP-8] Cache-Aside: miss=${missDuration}ms, hit=${hitDuration}ms, speedup=${Math.round(missDuration / Math.max(hitDuration, 1))}x`,
    );

    return {
      step: 8,
      concept:
        'Cache-Aside (Lazy Loading) — самый распространённый паттерн кэширования',
      commands: [
        'GET (check cache)',
        'SET ... EX (write to cache)',
        'DEL (invalidate)',
      ],
      results: {
        firstRequest: {
          source: firstRequestSource,
          durationMs: missDuration,
          product,
        },
        secondRequest: {
          source: secondRequestSource,
          durationMs: hitDuration,
          speedupVsDb: `~${Math.round(50 / Math.max(hitDuration, 1))}x быстрее`,
          remainingTtl: `${remainingTtl}s`,
        },
        cacheInvalidation: {
          deleted: deleteResult === 1,
          afterDelete:
            afterInvalidation === null
              ? 'null (кэш очищен)'
              : afterInvalidation,
        },
      },
      patterns: {
        cacheAside: 'check → miss → load → cache',
        writeThrough: 'write DB + write cache atomically',
        writeBehind: 'write cache → async flush to DB',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 9: PIPELINING — Батч-выполнение команд
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Pipelining — отправка множества команд за одно TCP соединение
   *
   * Без pipeline: каждая команда = RTT (Round Trip Time) ≈ 1-5ms по сети
   *   10 команд = 10 RTT = 10-50ms только на сетевую задержку
   *
   * С pipeline: все команды в одном пакете → один RTT для всего батча
   *   10 команд = 1 RTT = 1-5ms
   *
   * ВАЖНО: Pipeline НЕ атомарный! Если одна команда упадёт — остальные выполнятся.
   * Для атомарности нужен MULTI/EXEC (Шаг 10).
   *
   * Когда использовать:
   *   ✅ Bulk writes (загрузка данных)
   *   ✅ Инициализация (создать 1000 ключей)
   *   ✅ Независимые команды которые не зависят друг от друга
   *   ❌ Когда результат одной команды нужен для следующей (используй Lua Script)
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Чем Pipeline отличается от MULTI/EXEC?"
   *   A: Pipeline — клиентская оптимизация (batch network), НЕ атомарный.
   *      MULTI/EXEC — серверная транзакция (атомарная), но больше overhead.
   *      Pipeline + MULTI/EXEC можно комбинировать!
   *
   * curl -X POST http://localhost:3000/redis/learn/9-pipeline
   */
  @Post('9-pipeline')
  async step9Pipeline() {
    const prefix = 'redis:learn:pipeline';

    // ─── Без pipeline: 10 последовательных SET ────────────────────────────
    const startSequential = Date.now();
    for (let i = 0; i < 10; i++) {
      await this.redis.set(`${prefix}:seq:key${i}`, `value${i}`);
    }
    const seqDuration = Date.now() - startSequential;

    // Очистим ключи
    const seqKeys = Array.from(
      { length: 10 },
      (_, i) => `${prefix}:seq:key${i}`,
    );
    await this.redis.del(...seqKeys);

    // ─── С pipeline: 10 команд за один RTT ───────────────────────────────
    const startPipeline = Date.now();
    const pipeline = this.redis.pipeline();

    // Добавляем команды — они НЕ выполняются сразу
    for (let i = 0; i < 10; i++) {
      pipeline.set(`${prefix}:pip:key${i}`, `pipelined-value${i}`, 'EX', 30);
    }
    // Дополнительные типы команд в одном pipeline
    pipeline.lpush(`${prefix}:pip:list`, 'a', 'b', 'c');
    pipeline.hset(`${prefix}:pip:hash`, { field1: 'val1', field2: 'val2' });
    pipeline.zadd(`${prefix}:pip:zset`, 100, 'member1');
    pipeline.sadd(`${prefix}:pip:set`, 'elem1', 'elem2', 'elem3');

    // exec() — отправляем всё одним TCP-пакетом. Возвращает массив [error, result][]
    const results = await pipeline.exec();

    const pipeDuration = Date.now() - startPipeline;

    // Читаем некоторые результаты
    const key5 = await this.redis.get(`${prefix}:pip:key5`);
    const listLen = await this.redis.llen(`${prefix}:pip:list`);

    // Очистка
    const pipKeys = Array.from(
      { length: 10 },
      (_, i) => `${prefix}:pip:key${i}`,
    );
    await this.redis.del(
      ...pipKeys,
      `${prefix}:pip:list`,
      `${prefix}:pip:hash`,
      `${prefix}:pip:zset`,
      `${prefix}:pip:set`,
    );

    this.logger.log(
      `[STEP-9] Pipeline: sequential=${seqDuration}ms, pipeline=${pipeDuration}ms`,
    );

    return {
      step: 9,
      concept: 'Pipelining — все команды в одном TCP-пакете',
      commands: ['pipeline()', '.set()', '.lpush()', '.hset()', '.exec()'],
      results: {
        sequential: { durationMs: seqDuration, commands: 10 },
        pipeline: {
          durationMs: pipeDuration,
          commands: 14,
          resultsCount: results?.length ?? 0,
          sampleResult: key5,
          listLen,
        },
        note: 'В production разница значительнее при сетевой задержке (RTT >> 0)',
      },
      warnings: [
        '⚠️ Pipeline НЕ атомарный — команды могут частично выполниться',
        '⚠️ Не используй результат команды N как аргумент команды N+1 (нет ordering)',
        '✅ Для атомарности используй MULTI/EXEC (Шаг 10) или Lua Script (Шаг 11)',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 10: TRANSACTIONS — MULTI/EXEC/WATCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Транзакции в Redis — MULTI/EXEC/WATCH
   *
   * MULTI — начало транзакции. Все следующие команды ставятся в очередь.
   * EXEC — выполнить все команды в очереди атомарно.
   * DISCARD — отменить транзакцию (очистить очередь).
   *
   * Особенности Redis транзакций:
   *   ✅ Атомарность: либо все команды, либо ни одной (если WATCH сработал)
   *   ✅ Изоляция: другие клиенты не видят промежуточные состояния
   *   ❌ НЕТ Rollback при ошибке времени выполнения (синтаксические ошибки — да)
   *   ❌ Нельзя использовать результат предыдущей команды в следующей
   *
   * WATCH — оптимистичная блокировка:
   *   WATCH key → MULTI → команды → EXEC
   *   Если key изменился между WATCH и EXEC → EXEC вернёт null (транзакция отменена)
   *   Это аналог Optimistic Locking / CAS (Compare-And-Swap)
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Если одна команда в MULTI/EXEC упадёт с ошибкой — откатятся ли остальные?"
   *   A: НЕТ! Redis транзакции не имеют rollback для ошибок времени выполнения.
   *      Синтаксические ошибки (до EXEC) → EXEC вернёт ошибку и отменит всё.
   *      Логические ошибки (во время EXEC) → остальные команды выполнятся!
   *
   * curl -X POST http://localhost:3000/redis/learn/10-transactions
   */
  @Post('10-transactions')
  async step10Transactions() {
    const balanceKey = 'redis:learn:tx:balance:user1';
    const watchKey = 'redis:learn:tx:watch-demo';

    // ─── Базовая транзакция MULTI/EXEC ────────────────────────────────────
    await this.redis.set(balanceKey, '1000');

    // В ioredis транзакция — это multi() + exec()
    const txResult = await this.redis
      .multi()
      .get(balanceKey) // прочитать баланс
      .decrby(balanceKey, 200) // списать 200
      .incrby(balanceKey, 50) // начислить 50
      .set(`${balanceKey}:log`, `tx at ${new Date().toISOString()}`)
      .exec();

    const finalBalance = await this.redis.get(balanceKey);

    // ─── WATCH — оптимистичная блокировка ─────────────────────────────────
    await this.redis.set(watchKey, '0');

    // Сценарий 1: WATCH + EXEC без конкурентного изменения (успех)
    await this.redis.watch(watchKey);
    const watchedValue = await this.redis.get(watchKey);

    const watchTxResult = await this.redis
      .multi()
      .incr(watchKey) // если никто не изменил watchKey — выполнится
      .exec();

    // Результат: null если WATCH сработал (конкурентное изменение), иначе массив
    const watchSuccess = watchTxResult !== null;

    // ─── Демонстрация отката WATCH ────────────────────────────────────────
    // Сценарий 2: Симулируем что кто-то изменил ключ между WATCH и EXEC
    await this.redis.set(watchKey, '10');
    await this.redis.watch(watchKey);

    // "Другой клиент" изменяет ключ
    await this.redis.set(watchKey, '99');

    // Пытаемся выполнить транзакцию — EXEC должен вернуть null (отказ)
    const failedTxResult = await this.redis.multi().incr(watchKey).exec();

    const watchFailed = failedTxResult === null;
    const actualValue = await this.redis.get(watchKey); // 99, не 100

    // Очистка
    await this.redis.del(balanceKey, `${balanceKey}:log`, watchKey);

    this.logger.log(
      `[STEP-10] Tx: balance=1000→${finalBalance}, watchSuccess=${watchSuccess}, watchFailed=${watchFailed}`,
    );

    return {
      step: 10,
      concept: 'Transactions — MULTI, EXEC, WATCH (Optimistic Locking)',
      commands: ['MULTI', 'EXEC', 'DISCARD', 'WATCH'],
      results: {
        basicTransaction: {
          initialBalance: 1000,
          operations: ['decrby 200', 'incrby 50'],
          finalBalance: parseInt(finalBalance ?? '0'),
          txResult: txResult?.map(([err, val]) => ({
            error: err?.message,
            value: val,
          })),
        },
        watchDemo: {
          scenario1NoConflict: {
            success: watchSuccess,
            result: watchTxResult,
          },
          scenario2WithConflict: {
            watchFailed,
            explanation: watchFailed
              ? 'WATCH сработал: ключ изменился между WATCH и EXEC → EXEC вернул null'
              : 'WATCH не сработал',
            actualValue,
          },
        },
      },
      warnings: [
        '⚠️ Redis НЕ откатывает ошибки времени выполнения (runtime errors)',
        '⚠️ WATCH сбрасывается после EXEC или DISCARD',
        '✅ Для сложной логики используй Lua Script (Шаг 11) — атомарнее и эффективнее',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 11: LUA SCRIPTS — Атомарные скрипты
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Lua-скрипты в Redis (EVAL)
   *
   * EVAL script numkeys [key...] [arg...] — выполнить Lua-скрипт атомарно.
   *
   * Преимущества перед MULTI/EXEC:
   *   ✅ Условная логика (if/else) внутри скрипта
   *   ✅ Использование результата одной команды в другой
   *   ✅ Настоящая атомарность (как single command)
   *   ✅ EVALSHA — кэшировать скрипт по SHA1 хэшу (экономия трафика)
   *
   * Lua в Redis:
   *   redis.call('GET', KEYS[1]) — выполнить команду, бросить ошибку при fail
   *   redis.pcall('GET', KEYS[1]) — выполнить, вернуть ошибку как значение
   *   KEYS[1..N] — аргументы ключей (numkeys штук)
   *   ARGV[1..M] — дополнительные аргументы
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Можно ли в Lua-скрипте обращаться к ключам не указанным в KEYS?"
   *   A: Технически да, но это нарушает Redis Cluster routing.
   *      В Cluster режиме все ключи должны быть в KEYS[] и на одном шарде!
   *      Используй hash tags: {user:1}:balance и {user:1}:log → один шард
   *
   * curl -X POST http://localhost:3000/redis/learn/11-lua-script
   */
  @Post('11-lua-script')
  async step11LuaScript() {
    const counterKey = 'redis:learn:lua:rate-counter';
    const casKey = 'redis:learn:lua:cas';
    const transferKey1 = 'redis:learn:lua:wallet:alice';
    const transferKey2 = 'redis:learn:lua:wallet:bob';

    // ─── Lua Script 1: Атомарный счётчик с лимитом ───────────────────────
    // Атомарный Rate Counter: INCREMENT и проверить лимит за один шаг
    const rateLimitScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])

      local current = redis.call('INCR', key)

      if current == 1 then
        redis.call('EXPIRE', key, window)
      end

      if current > limit then
        return {current, 0}  -- 0 = denied
      end

      return {current, 1}  -- 1 = allowed
    `;

    // Вызываем скрипт 5 раз — первые 3 разрешены, потом блокировка
    const rateResults: Array<{
      attempt: number;
      count: number;
      allowed: boolean;
    }> = [];
    for (let i = 1; i <= 5; i++) {
      const result = (await this.redis.eval(
        rateLimitScript,
        1,
        counterKey,
        '3',
        '60',
      )) as number[];
      rateResults.push({
        attempt: i,
        count: result[0],
        allowed: result[1] === 1,
      });
    }

    // ─── Lua Script 2: Compare-And-Swap (CAS) ────────────────────────────
    // Атомарно: прочитать → сравнить → записать (если значение совпадает)
    const casScript = `
      local key = KEYS[1]
      local expected = ARGV[1]
      local newVal = ARGV[2]

      local current = redis.call('GET', key)

      if current == false then
        return redis.error_reply('Key does not exist')
      end

      if current ~= expected then
        return 0  -- CAS failed: значение изменилось
      end

      redis.call('SET', key, newVal)
      return 1  -- CAS success
    `;

    await this.redis.set(casKey, 'original-value');
    const casSuccess = await this.redis.eval(
      casScript,
      1,
      casKey,
      'original-value',
      'new-value',
    );
    const casFail = await this.redis.eval(
      casScript,
      1,
      casKey,
      'original-value',
      'another-value',
    );
    const finalCasValue = await this.redis.get(casKey);

    // ─── Lua Script 3: Атомарный перевод между кошельками ────────────────
    const transferScript = `
      local src = KEYS[1]
      local dst = KEYS[2]
      local amount = tonumber(ARGV[1])

      local srcBalance = tonumber(redis.call('GET', src))

      if srcBalance == nil then
        return redis.error_reply('Source wallet not found')
      end

      if srcBalance < amount then
        return redis.error_reply('Insufficient funds: ' .. srcBalance .. ' < ' .. amount)
      end

      redis.call('DECRBY', src, amount)
      redis.call('INCRBY', dst, amount)

      local newSrc = redis.call('GET', src)
      local newDst = redis.call('GET', dst)

      return {tonumber(newSrc), tonumber(newDst)}
    `;

    await this.redis.set(transferKey1, '500');
    await this.redis.set(transferKey2, '200');

    const transferResult = (await this.redis.eval(
      transferScript,
      2,
      transferKey1,
      transferKey2,
      '150',
    )) as number[];

    // Очистка
    await this.redis.del(counterKey, casKey, transferKey1, transferKey2);

    this.logger.log(
      `[STEP-11] Lua: rate=${rateResults.length} attempts, CAS=${casSuccess}, transfer=${transferResult}`,
    );

    return {
      step: 11,
      concept: 'Lua Scripts — EVAL для атомарных составных операций',
      commands: ['EVAL', 'EVALSHA', 'SCRIPT LOAD', 'SCRIPT EXISTS'],
      results: {
        rateLimitScript: {
          description: 'Атомарный rate counter: лимит 3 запроса за 60 сек',
          attempts: rateResults,
        },
        compareAndSwap: {
          description: 'Атомарный CAS: прочитать → сравнить → записать',
          casSuccess: casSuccess === 1,
          casFail: casFail === 0,
          finalValue: finalCasValue,
        },
        atomicTransfer: {
          description: 'Перевод 150 от Alice к Bob (атомарно)',
          aliceBalance: transferResult?.[0] ?? 'error',
          bobBalance: transferResult?.[1] ?? 'error',
        },
      },
      interviewTip:
        'В Redis Cluster: все KEYS[] должны быть на одном шарде. Используй hash tags: {user}:key',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 12: DISTRIBUTED LOCK — Распределённая блокировка
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Distributed Lock (Распределённый замок)
   *
   * Проблема: в микросервисной архитектуре несколько инстансов могут
   * одновременно выполнять одну и ту же операцию (например, отправить email).
   *
   * Решение через Redis: SET lock:key owner NX EX timeout
   *   NX — установить только если ключ НЕ существует (атомарно!)
   *   EX — автоматически удалить через timeout (защита от deadlock)
   *   value = owner-id — только владелец может разблокировать
   *
   * Алгоритм Redlock (для высокой доступности):
   *   1. Попытаться захватить замок на N/2+1 независимых нодах Redis
   *   2. Если успешно — работаем (время = min TTL - время захвата)
   *   3. Освободить на всех нодах
   *
   * Проблема "продления": если работа занимает больше TTL → замок освободится
   * раньше времени! Решение: фоновый поток продлевает TTL (watchdog pattern).
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Почему нельзя использовать DEL для разблокировки без проверки owner?"
   *   A: Инстанс A берёт замок (TTL=10s). Работа зависает на 15s.
   *      TTL истекает, Redis удаляет замок.
   *      Инстанс B берёт замок.
   *      Инстанс A завершает работу и делает DEL — удаляет замок B!
   *      Решение: Lua-скрипт "GET → проверить owner → DEL" атомарно.
   *
   * curl -X POST http://localhost:3000/redis/learn/12-distributed-lock
   */
  @Post('12-distributed-lock')
  async step12DistributedLock() {
    const lockKey = 'redis:learn:lock:critical-section';
    const ownerId = `worker-${Math.random().toString(36).substring(2, 9)}`;
    const LOCK_TTL = 10; // секунд

    // Lua-скрипт для безопасного освобождения замка
    // Атомарно: GET → проверить owner → DEL
    const unlockScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;

    // ─── Захват замка ─────────────────────────────────────────────────────
    // SET key value NX EX seconds — атомарная команда
    const acquired = await this.redis.set(
      lockKey,
      ownerId,
      'EX',
      LOCK_TTL,
      'NX',
    );
    const lockAcquired = acquired === 'OK';

    let workResult: string;
    let releaseResult: number | string;
    let ttlAtRelease: number | string;

    if (lockAcquired) {
      // ─── Критическая секция ───────────────────────────────────────────
      // Только один воркер одновременно может здесь находиться
      this.logger.log(`[STEP-12] Lock acquired by ${ownerId}`);

      // Симуляция работы
      await new Promise((r) => setTimeout(r, 100));
      workResult = `Критическая задача выполнена воркером ${ownerId}`;

      ttlAtRelease = await this.redis.ttl(lockKey);

      // ─── Безопасное освобождение через Lua-скрипт ────────────────────
      const releaseNum = (await this.redis.eval(
        unlockScript,
        1,
        lockKey,
        ownerId,
      )) as number;
      releaseResult =
        releaseNum === 1
          ? 'Замок освобождён ✅'
          : 'Замок уже освобождён или чужой ❌';
    } else {
      workResult = 'Замок занят другим воркером';
      releaseResult = 'N/A';
      ttlAtRelease = await this.redis.ttl(lockKey);
    }

    // ─── Демонстрация конкуренции ─────────────────────────────────────────
    const competitor1 = `competitor-${Math.random().toString(36).substring(2, 6)}`;
    const competitor2 = `competitor-${Math.random().toString(36).substring(2, 6)}`;

    // Устанавливаем замок от competitor1
    const compLockKey = 'redis:learn:lock:competition';
    const comp1Acquired = await this.redis.set(
      compLockKey,
      competitor1,
      'EX',
      5,
      'NX',
    );
    // competitor2 пытается получить тот же замок
    const comp2Acquired = await this.redis.set(
      compLockKey,
      competitor2,
      'EX',
      5,
      'NX',
    );

    // competitor2 пытается освободить замок competitor1 — ДОЛЖНО ПРОВАЛИТЬСЯ
    const illegalRelease = (await this.redis.eval(
      unlockScript,
      1,
      compLockKey,
      competitor2,
    )) as number;
    const actualOwner = await this.redis.get(compLockKey);

    // Легитимное освобождение
    await this.redis.eval(unlockScript, 1, compLockKey, competitor1);

    this.logger.log(
      `[STEP-12] Lock: acquired=${lockAcquired}, illegalRelease=${illegalRelease}`,
    );

    return {
      step: 12,
      concept: 'Distributed Lock — SET NX EX + Lua unlock',
      commands: [
        'SET key value NX EX ttl',
        'GET (verify owner)',
        'DEL (conditional via Lua)',
      ],
      results: {
        lock: {
          ownerId,
          acquired: lockAcquired,
          workResult,
          ttlAtRelease,
          releaseResult,
        },
        competition: {
          competitor1: { acquired: comp1Acquired === 'OK' },
          competitor2: {
            acquired: comp2Acquired === null,
            note: 'null = замок уже занят',
          },
          illegalRelease: {
            attempt: `${competitor2} пытается освободить замок ${competitor1}`,
            result:
              illegalRelease === 0
                ? 'Отказано ✅ (защита работает!)'
                : 'Успешно (баг!)',
            actualOwner,
          },
        },
      },
      antiPatterns: [
        '❌ DEL без проверки owner → можно удалить чужой замок',
        '❌ SETNX + EXPIRE (два вызова) → не атомарно! Используй SET NX EX',
        '❌ Слишком короткий TTL → замок истечёт раньше завершения работы',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 13: RATE LIMITER — Ограничитель частоты запросов
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Rate Limiting — защита API от злоупотреблений
   *
   * Алгоритмы Rate Limiting:
   *
   * 1. Fixed Window Counter (Фиксированное окно):
   *    - Окно: 60 секунд с момента первого запроса
   *    - Ключ: rate:userId:minute-bucket
   *    - INCR + EXPIRE при первом запросе
   *    - Проблема: burst в конце окна + начало следующего = 2x лимит
   *
   * 2. Sliding Window Log:
   *    - Храним UNIX timestamp каждого запроса в Sorted Set
   *    - ZADD ts userId → ZREMRANGEBYSCORE (удалить старые) → ZCARD (count)
   *    - Точный, но много памяти
   *
   * 3. Token Bucket:
   *    - Токены накапливаются со временем (rate tokens/sec)
   *    - Запрос тратит 1 токен. Если нет токенов — отказ.
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Проблема Fixed Window Counter?"
   *   A: Edge burst: в конце окна N запросов + сразу N в начале следующего = 2N.
   *      Sliding Window решает это но дороже по памяти.
   *      В продакшене часто используют Sliding Window Log для VIP, Fixed Window для всех.
   *
   * curl -X POST http://localhost:3000/redis/learn/13-rate-limiter
   */
  @Post('13-rate-limiter')
  async step13RateLimiter(@Body() body: { userId?: string }) {
    const userId = body.userId ?? 'user:anonymous';
    const LIMIT = 5; // запросов
    const WINDOW_SECONDS = 60; // секунд

    // ─── Алгоритм 1: Fixed Window Counter ─────────────────────────────────
    const fixedWindowKey = `redis:learn:rl:fixed:${userId}`;

    const fixedLimitScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])

      local count = redis.call('INCR', key)

      if count == 1 then
        redis.call('EXPIRE', key, window)
      end

      local ttl = redis.call('TTL', key)

      if count > limit then
        return {count, 0, ttl}
      end

      return {count, 1, ttl}
    `;

    const fixedResults: Array<{
      request: number;
      count: number;
      allowed: boolean;
      ttl: number;
    }> = [];
    for (let i = 1; i <= 7; i++) {
      const r = (await this.redis.eval(
        fixedLimitScript,
        1,
        fixedWindowKey,
        String(LIMIT),
        String(WINDOW_SECONDS),
      )) as number[];
      fixedResults.push({
        request: i,
        count: r[0],
        allowed: r[1] === 1,
        ttl: r[2],
      });
    }

    // ─── Алгоритм 2: Sliding Window Log via Sorted Set ────────────────────
    const slidingKey = `redis:learn:rl:sliding:${userId}`;

    const slidingLimitScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local reqId = ARGV[4]

      -- Удалить запросы старше окна
      local windowStart = now - (window * 1000)
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

      -- Количество запросов в текущем окне
      local count = redis.call('ZCARD', key)

      if count >= limit then
        -- Узнать когда освободится слот
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        return {count, 0, -1}
      end

      -- Добавить текущий запрос
      redis.call('ZADD', key, now, reqId)
      redis.call('EXPIRE', key, window + 1)

      return {count + 1, 1, limit - count - 1}
    `;

    const slidingResults: Array<{
      request: number;
      count: number;
      allowed: boolean;
      remaining: number;
    }> = [];
    for (let i = 1; i <= 7; i++) {
      const now = Date.now();
      const r = (await this.redis.eval(
        slidingLimitScript,
        1,
        slidingKey,
        String(LIMIT),
        String(WINDOW_SECONDS),
        String(now),
        `req:${now}:${i}`,
      )) as number[];
      slidingResults.push({
        request: i,
        count: r[0],
        allowed: r[1] === 1,
        remaining: r[2],
      });
    }

    // Очистка
    await this.redis.del(fixedWindowKey, slidingKey);

    this.logger.log(
      `[STEP-13] Rate Limiter: fixed=${fixedResults.filter((r) => r.allowed).length}/7 allowed`,
    );

    return {
      step: 13,
      concept: 'Rate Limiting — Fixed Window Counter + Sliding Window Log',
      commands: ['INCR', 'EXPIRE', 'ZADD', 'ZREMRANGEBYSCORE', 'ZCARD', 'EVAL'],
      limit: LIMIT,
      windowSeconds: WINDOW_SECONDS,
      results: {
        fixedWindow: {
          algorithm: 'INCR + EXPIRE (Fixed Window Counter)',
          pros: ['Минимум памяти', 'Простота реализации'],
          cons: ['Edge burst: 2x лимит на стыке окон'],
          attempts: fixedResults,
        },
        slidingWindow: {
          algorithm: 'ZADD + ZREMRANGEBYSCORE (Sliding Window Log)',
          pros: ['Точный подсчёт', 'Нет edge burst'],
          cons: ['Больше памяти (храним все timestamps)'],
          attempts: slidingResults,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 14: PUB/SUB — Публикация и подписка
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Pub/Sub в Redis
   *
   * Pub/Sub — паттерн "Издатель/Подписчик" (fire-and-forget).
   * Publisher публикует сообщение в канал, не зная кто подписан.
   * Subscriber получает все сообщения пока подписан.
   *
   * ВАЖНЫЕ ОГРАНИЧЕНИЯ Redis Pub/Sub:
   *   ❌ Нет persistence: если подписчик офлайн — сообщения теряются
   *   ❌ Нет гарантии доставки (at-most-once)
   *   ❌ Нет consumer groups (как в Kafka/RabbitMQ)
   *   ✅ Очень быстро: сотни тысяч сообщений/сек
   *   ✅ Pattern matching: PSUBSCRIBE user.* — подписка по маске
   *
   * Когда использовать Redis Pub/Sub:
   *   ✅ Real-time уведомления (чат, live updates)
   *   ✅ Cache invalidation сигналы между инстансами
   *   ✅ Слабосвязанные события (не критичные к потере)
   *   ❌ Критические бизнес-события → используй Kafka или RabbitMQ
   *
   * Команды Redis CLI:
   *   SUBSCRIBE redis:learn:pubsub:notifications
   *   PUBLISH redis:learn:pubsub:notifications "Hello Subscribers!"
   *   PSUBSCRIBE redis:learn:*
   *   PUBSUB CHANNELS
   *   PUBSUB NUMSUB redis:learn:pubsub:notifications
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Redis Pub/Sub vs Kafka — когда что выбрать?"
   *   A: Redis — ephemeral, ultra-fast, at-most-once. Для cache invalidation, чата.
   *      Kafka — persistent, ordered, consumer groups, replay. Для платежей, аудита.
   *
   * curl http://localhost:3000/redis/learn/14-pub-sub
   */
  @Get('14-pub-sub')
  async step14PubSub() {
    const channel = 'redis:learn:pubsub:events';
    const patternChannel = 'redis:learn:pubsub:user.*';

    // Узнать текущих подписчиков на канале (до публикации)
    const subsBefore = (await this.redis.pubsub('NUMSUB', channel)) as string[];

    // PUBLISH — опубликовать сообщение. Возвращает количество получателей.
    // Если 0 — никто не подписан, сообщение потеряно (fire-and-forget)
    const receivers1 = await this.redis.publish(
      channel,
      JSON.stringify({
        event: 'USER_LOGGED_IN',
        userId: 'user:42',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.100',
      }),
    );

    const receivers2 = await this.redis.publish(
      channel,
      JSON.stringify({
        event: 'PAYMENT_COMPLETED',
        orderId: 'order:789',
        amount: 2999,
        currency: 'RUB',
      }),
    );

    // Pattern channels — публикуем в разные пользовательские каналы
    const receivers3 = await this.redis.publish(
      'redis:learn:pubsub:user.1',
      JSON.stringify({
        event: 'NOTIFICATION',
        message: 'У вас новое сообщение',
      }),
    );

    // PUBSUB CHANNELS — все активные каналы (с подписчиками)
    const activeChannels = (await this.redis.pubsub(
      'CHANNELS',
      'redis:learn:*',
    )) as string[];

    // PUBSUB SHARDNUMSUB (Redis 7+) — подписчики в шард-каналах
    const numSub = (await this.redis.pubsub('NUMSUB', channel)) as string[];

    this.logger.log(
      `[STEP-14] Pub/Sub: published to "${channel}", receivers=${receivers1}+${receivers2}`,
    );

    return {
      step: 14,
      concept:
        'Pub/Sub — PUBLISH, SUBSCRIBE, PSUBSCRIBE (fire-and-forget messaging)',
      commands: [
        'PUBLISH channel message',
        'SUBSCRIBE channel',
        'PSUBSCRIBE pattern',
        'PUBSUB CHANNELS',
        'PUBSUB NUMSUB',
      ],
      results: {
        published: [
          { channel, message: 'USER_LOGGED_IN', receivers: receivers1 },
          { channel, message: 'PAYMENT_COMPLETED', receivers: receivers2 },
          {
            channel: 'redis:learn:pubsub:user.1',
            message: 'NOTIFICATION',
            receivers: receivers3,
          },
        ],
        activeChannels,
        numSub: { channel, subscribers: numSub },
        subsBefore:
          subsBefore.length > 0 ? subsBefore : 'нет активных подписчиков',
      },
      limitations: [
        '❌ Нет persistence: офлайн-подписчики пропускают сообщения',
        '❌ Нет гарантии доставки (at-most-once)',
        '❌ Нельзя прочитать историю сообщений',
        '✅ Используй Redis Streams (XADD/XREAD) для persistent очередей',
        '✅ Или Kafka для enterprise-grade event streaming',
      ],
      howToTest: [
        'Открой два терминала:',
        '1: docker exec -it redis redis-cli SUBSCRIBE redis:learn:pubsub:events',
        '2: curl http://localhost:3000/redis/learn/14-pub-sub',
        'В терминале 1 увидишь сообщения в реальном времени!',
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 15: HYPERLOGLOG — Вероятностный подсчёт уникальных значений
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: HyperLogLog — умный подсчёт уникальных элементов
   *
   * HyperLogLog — вероятностная структура данных для подсчёта УНИКАЛЬНЫХ элементов.
   *
   * Зачем? Посчитать уникальных посетителей сайта:
   *   Naive: Set → добавить userId → SCARD. Но 1M уникальных = 1M строк в памяти!
   *   HyperLogLog: 12KB фиксированно, независимо от числа элементов. Погрешность ±0.81%.
   *
   * Команды:
   *   PFADD key element [element...] — добавить элемент(ы)
   *   PFCOUNT key [key...] — получить приблизительное количество уникальных
   *   PFMERGE destkey sourcekey [sourcekey...] — объединить несколько HLL
   *
   * Математика: использует хэши и подсчёт leading zeros → оценка cardinality.
   * Погрешность: ~0.81% при > 1000 элементов.
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Когда НЕ использовать HyperLogLog?"
   *   A: 1. Нужна точность 100% → используй Set
   *      2. Нужно знать КАКИЕ именно элементы уникальны → Set
   *      3. Меньше ~1000 элементов → обычный Set дешевле
   *      4. Нужно удалять элементы → HLL не поддерживает delete
   *
   * curl http://localhost:3000/redis/learn/15-hyperloglog
   */
  @Get('15-hyperloglog')
  async step15HyperLogLog() {
    const todayKey = 'redis:learn:hll:visitors:today';
    const yesterdayKey = 'redis:learn:hll:visitors:yesterday';
    const totalKey = 'redis:learn:hll:visitors:total';

    // ─── Симуляция: 1000 посещений с повторами ────────────────────────────
    // 600 уникальных пользователей посещают сайт сегодня
    const uniqueTodayUsers = Array.from({ length: 600 }, (_, i) => `user:${i}`);
    const repeatedVisits = [
      ...uniqueTodayUsers,
      ...uniqueTodayUsers.slice(0, 200), // 200 пользователей посещают повторно
      ...uniqueTodayUsers.slice(0, 100), // и ещё 100 по третьему разу
    ];

    // PFADD — добавить элементы. Возвращает 1 если внутреннее состояние изменилось
    for (let i = 0; i < repeatedVisits.length; i += 50) {
      const batch = repeatedVisits.slice(i, i + 50);
      await this.redis.pfadd(todayKey, ...batch);
    }
    await this.redis.expire(todayKey, 86400); // 24 часа

    // PFCOUNT — приблизительный подсчёт уникальных
    const uniqueToday = await this.redis.pfcount(todayKey);

    // Вчерашние посетители: 500 уникальных, 300 пересекаются с сегодняшними
    const uniqueYesterdayUsers = Array.from(
      { length: 500 },
      (_, i) => `user:${i + 300}`,
    );
    await this.redis.pfadd(yesterdayKey, ...uniqueYesterdayUsers);
    await this.redis.expire(yesterdayKey, 86400);
    const uniqueYesterday = await this.redis.pfcount(yesterdayKey);

    // PFMERGE — объединить: уникальные за оба дня вместе
    await this.redis.pfmerge(totalKey, todayKey, yesterdayKey);
    const uniqueTotal = await this.redis.pfcount(totalKey);
    await this.redis.expire(totalKey, 86400);

    // Сравнение точности: обычный Set
    const exactSet = new Set(repeatedVisits);

    const accuracy = (
      (1 - Math.abs(uniqueToday - exactSet.size) / exactSet.size) *
      100
    ).toFixed(2);

    // Оценка памяти
    const hllMemory = '12 KB (фиксировано для любого числа элементов)';
    const setMemory = `~${Math.round((uniqueTodayUsers.length * 50) / 1024)} KB (приблизительно для ${uniqueTodayUsers.length} элементов)`;

    // Очистка
    await this.redis.del(todayKey, yesterdayKey, totalKey);

    this.logger.log(
      `[STEP-15] HLL: unique today≈${uniqueToday} (exact=${exactSet.size}), accuracy=${accuracy}%`,
    );

    return {
      step: 15,
      concept: 'HyperLogLog — вероятностный подсчёт уникальных элементов',
      commands: [
        'PFADD key elements...',
        'PFCOUNT key',
        'PFMERGE destkey src1 src2',
      ],
      results: {
        today: {
          totalVisits: repeatedVisits.length,
          hllEstimate: uniqueToday,
          exactCount: exactSet.size,
          accuracy: `${accuracy}%`,
        },
        yesterday: {
          hllEstimate: uniqueYesterday,
        },
        total: {
          hllMerged: uniqueTotal,
          note: 'PFMERGE объединяет HLL без дублей',
        },
        memoryComparison: {
          hyperLogLog: hllMemory,
          exactSet: setMemory,
          winner: 'HyperLogLog экономит ~99% памяти при 1M+ элементах',
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 16: BITMAP — Битовые операции
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Bitmaps — хранение булевых флагов компактно
   *
   * Bitmap — строка Redis, в которой каждый бит может быть 0 или 1.
   * 1 миллиард пользователей = 128 MB памяти (1 бит на пользователя!).
   *
   * Типичные use-cases:
   *   📅 Ежедневная активность: SETBIT daily:2024-01-01 userId 1
   *   🚩 Feature flags: бит на пользователя для A/B тестирования
   *   ✅ Присутствие: SETBIT online:users userId 1 при коннекте
   *   📊 Когортный анализ: BITOP AND result active:jan active:feb
   *
   * BITCOUNT — подсчитать количество установленных битов (алгоритм Popcnt).
   * BITOP — битовые операции (AND, OR, XOR, NOT) над несколькими ключами.
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как отследить ежедневную активность 100M пользователей?"
   *   A: SETBIT active:2024-01-01 userId 1 при каждом login.
   *      BITCOUNT active:2024-01-01 = количество активных за день.
   *      Один ключ = ~12.5 MB для 100M пользователей. Очень компактно!
   *
   * curl http://localhost:3000/redis/learn/16-bitmap
   */
  @Get('16-bitmap')
  async step16Bitmap() {
    const todayKey = 'redis:learn:bitmap:active:today';
    const yesterdayKey = 'redis:learn:bitmap:active:yesterday';
    const bothDaysKey = 'redis:learn:bitmap:active:both-days';

    // ─── Симуляция: активные пользователи сегодня ─────────────────────────
    // userId используется как offset в битовом массиве
    const todayActiveUsers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    const yesterdayActiveUsers = [2, 3, 7, 13, 21, 55, 89, 200, 300];

    // SETBIT key offset value — установить бит по offset
    for (const userId of todayActiveUsers) {
      await this.redis.setbit(todayKey, userId, 1);
    }
    await this.redis.expire(todayKey, 86400);

    for (const userId of yesterdayActiveUsers) {
      await this.redis.setbit(yesterdayKey, userId, 1);
    }
    await this.redis.expire(yesterdayKey, 86400);

    // GETBIT key offset — проверить конкретный бит
    const isUser3ActiveToday = await this.redis.getbit(todayKey, 3);
    const isUser99ActiveToday = await this.redis.getbit(todayKey, 99);

    // BITCOUNT — посчитать установленные биты (количество активных)
    const totalActiveToday = await this.redis.bitcount(todayKey);
    const totalActiveYesterday = await this.redis.bitcount(yesterdayKey);

    // BITOP AND — пользователи активные В ОБА дня (ретеншн!)
    await this.redis.bitop('AND', bothDaysKey, todayKey, yesterdayKey);
    const retainedUsers = await this.redis.bitcount(bothDaysKey);
    await this.redis.expire(bothDaysKey, 86400);

    // BITOP OR — пользователи активные ХОТЯ БЫ в один из дней
    const unionKey = 'redis:learn:bitmap:active:any-day';
    await this.redis.bitop('OR', unionKey, todayKey, yesterdayKey);
    const anyDayActive = await this.redis.bitcount(unionKey);

    // ─── Feature Flags: A/B тестирование ─────────────────────────────────
    const featureFlagKey = 'redis:learn:bitmap:feature:new-ui';
    const usersInExperiment = [10, 25, 42, 67, 88, 103];

    for (const userId of usersInExperiment) {
      await this.redis.setbit(featureFlagKey, userId, 1);
    }
    await this.redis.expire(featureFlagKey, 3600);

    const isUser42InExperiment = await this.redis.getbit(featureFlagKey, 42);
    const isUser1InExperiment = await this.redis.getbit(featureFlagKey, 1);

    // Очистка
    await this.redis.del(
      todayKey,
      yesterdayKey,
      bothDaysKey,
      unionKey,
      featureFlagKey,
    );

    this.logger.log(
      `[STEP-16] Bitmap: today=${totalActiveToday}, retained=${retainedUsers}`,
    );

    return {
      step: 16,
      concept:
        'Bitmaps — SETBIT, GETBIT, BITCOUNT, BITOP (компактные булевы флаги)',
      commands: [
        'SETBIT key offset 0|1',
        'GETBIT key offset',
        'BITCOUNT key',
        'BITOP AND|OR|XOR dest src...',
      ],
      results: {
        dailyActive: {
          today: { users: todayActiveUsers, count: totalActiveToday },
          yesterday: {
            users: yesterdayActiveUsers,
            count: totalActiveYesterday,
          },
          retained: {
            count: retainedUsers,
            description: 'BITOP AND: активны оба дня',
          },
          anyDay: {
            count: anyDayActive,
            description: 'BITOP OR: активны хотя бы раз',
          },
        },
        membership: {
          user3ActiveToday: isUser3ActiveToday === 1,
          user99ActiveToday: isUser99ActiveToday === 1,
        },
        featureFlags: {
          user42InExperiment: isUser42InExperiment === 1,
          user1InExperiment: isUser1InExperiment === 1,
        },
        memoryEfficiency: {
          note: '1 бит на пользователя',
          for100MUsers: '~12.5 MB',
          for1BUsers: '~128 MB',
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 17: GEOSPATIAL — Геопространственные данные
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Geospatial индексы в Redis
   *
   * Redis хранит геоданные как Sorted Set, где score = Geohash координат.
   * Geohash — кодирует (longitude, latitude) в одно число с заданной точностью.
   *
   * Точность:
   *   52-bit Geohash в Redis → ±0.6 мм (очень точно!)
   *
   * Команды:
   *   GEOADD key longitude latitude member
   *   GEODIST key member1 member2 [m|km|mi|ft]
   *   GEOPOS key member
   *   GEOSEARCH key FROMMEMBER|FROMLONLAT longitude latitude BYRADIUS|BYBOX ASC|DESC COUNT N
   *
   * Внутри Geo — это Sorted Set с Geohash как score.
   * ZRANGE, ZSCORE и другие ZSet команды работают с Geo ключами!
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как Redis хранит геоданные и почему это эффективно?"
   *   A: Geo = Sorted Set где score = 52-bit Geohash.
   *      Geohash кодирует 2D координаты в 1D число с сохранением близости.
   *      GEOSEARCH = ZRANGEBYSCORE по geohash диапазону → O(log N + M).
   *      Нет отдельного индекса — геоданные и сортированный поиск в одной структуре!
   *
   * curl http://localhost:3000/redis/learn/17-geospatial
   */
  @Get('17-geospatial')
  async step17Geospatial() {
    const restaurantsKey = 'redis:learn:geo:restaurants';

    // ─── Добавление ресторанов ────────────────────────────────────────────
    // GEOADD: longitude, latitude, name
    // Москва: lon=37.6, lat=55.75
    const addResults = await Promise.all([
      this.redis.geoadd(restaurantsKey, 37.6176, 55.7558, 'Pushkin Restaurant'), // Пушкин
      this.redis.geoadd(restaurantsKey, 37.6063, 55.7539, 'White Rabbit'), // Белый Кролик
      this.redis.geoadd(restaurantsKey, 37.6155, 55.7535, 'Café Russe'),
      this.redis.geoadd(restaurantsKey, 37.6229, 55.7492, 'Meat & Fish'),
      this.redis.geoadd(restaurantsKey, 37.5893, 55.7462, 'Novikov Restaurant'),
      this.redis.geoadd(restaurantsKey, 37.64, 55.76, 'Twins Garden'),
    ]);

    // Сколько точек добавлено
    const totalRestaurants = await this.redis.zcard(restaurantsKey);

    // GEOPOS — получить координаты конкретных точек
    const positions = await this.redis.geopos(
      restaurantsKey,
      'Pushkin Restaurant',
      'White Rabbit',
    );

    // GEODIST — расстояние между двумя точками
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distancePushkinToRabbit = await (this.redis as any).geodist(
      restaurantsKey,
      'Pushkin Restaurant',
      'White Rabbit',
      'km',
    );

    // GEOSEARCH — рестораны в радиусе 1 км от центра (Красная площадь)
    // FROMLONLAT — от указанных координат
    // BYRADIUS — радиус поиска
    const nearbyRestaurants = await this.redis.geosearch(
      restaurantsKey,
      'FROMLONLAT',
      37.6173,
      55.752, // Красная площадь
      'BYRADIUS',
      1,
      'km',
      'ASC', // от ближайших к дальним
      'COUNT',
      5,
      'WITHCOORD',
      'WITHDIST',
    );

    // Очистка
    await this.redis.del(restaurantsKey);

    this.logger.log(
      `[STEP-17] Geo: ${totalRestaurants} restaurants, nearest: ${nearbyRestaurants.length}`,
    );

    return {
      step: 17,
      concept:
        'Geospatial — GEOADD, GEODIST, GEOPOS, GEOSEARCH (рестораны рядом)',
      commands: [
        'GEOADD',
        'GEOPOS',
        'GEODIST',
        'GEOSEARCH FROMLONLAT BYRADIUS',
      ],
      results: {
        added: {
          restaurants: addResults.reduce((a, b) => a + b, 0),
          total: totalRestaurants,
        },
        positions: {
          'Pushkin Restaurant': positions[0],
          'White Rabbit': positions[1],
        },
        distance: {
          between: ['Pushkin Restaurant', 'White Rabbit'],
          km: distancePushkinToRabbit,
        },
        nearbyKrasnayaPloshchad: {
          radius: '1 km',
          found: nearbyRestaurants.length,
          restaurants: nearbyRestaurants,
        },
      },
      implementation:
        'Geo хранится как Sorted Set с Geohash-score. GEOSEARCH = ZRANGEBYSCORE по geohash-диапазону.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 18: SESSION MANAGEMENT — Управление сессиями
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Сессии в Redis — замена stateful JWT хранению
   *
   * Зачем Redis для сессий?
   *   JWT: большой токен в каждом запросе, нельзя отозвать до истечения TTL
   *   Redis Session: маленький sessionId, можно мгновенно инвалидировать
   *
   * Архитектура:
   *   1. Login → создать сессию в Redis (Hash) → вернуть sessionId клиенту (cookie)
   *   2. Запрос → клиент шлёт sessionId → Redis HGETALL → проверить данные
   *   3. Logout → DEL session:sessionId (мгновенный logout!)
   *   4. Активность → EXPIRE session:id 1800 (refresh TTL)
   *
   * Hash для сессии vs String с JSON:
   *   Hash: можно обновить одно поле (lastAccessAt) без чтения всего объекта
   *   JSON String: нужно GET → parse → modify → SET
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как организовать logout со всех устройств?"
   *   A: Хранить Set активных сессий: SADD user:42:sessions sessionId1 sessionId2
   *      При logout-all: SMEMBERS user:42:sessions → DEL каждой сессии → DEL set
   *
   * curl -X POST http://localhost:3000/redis/learn/18-session \
   *   -H "Content-Type: application/json" \
   *   -d '{"userId": "42", "role": "admin"}'
   */
  @Post('18-session')
  async step18Session(@Body() body: { userId?: string; role?: string }) {
    const userId = body.userId ?? '42';
    const role = body.role ?? 'user';
    const SESSION_TTL = 1800; // 30 минут

    // Генерация sessionId (в реальности — криптографически случайный)
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const sessionKey = `redis:learn:session:${sessionId}`;
    const userSessionsKey = `redis:learn:user:${userId}:sessions`;

    // ─── Создание сессии ──────────────────────────────────────────────────
    await this.redis.hset(sessionKey, {
      userId,
      role,
      ip: '192.168.1.' + Math.floor(Math.random() * 255),
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      createdAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      requestCount: '1',
    });
    await this.redis.expire(sessionKey, SESSION_TTL);

    // Трекинг всех сессий пользователя
    await this.redis.sadd(userSessionsKey, sessionId);
    await this.redis.expire(userSessionsKey, SESSION_TTL);

    // ─── Чтение сессии ────────────────────────────────────────────────────
    const session = await this.redis.hgetall(sessionKey);
    const ttl = await this.redis.ttl(sessionKey);

    // ─── Обновление сессии (refresh TTL + lastAccessAt) ───────────────────
    await this.redis.hset(sessionKey, 'lastAccessAt', new Date().toISOString());
    await this.redis.hincrby(sessionKey, 'requestCount', 1);
    await this.redis.expire(sessionKey, SESSION_TTL); // Сброс таймера

    const updatedSession = await this.redis.hgetall(sessionKey);
    const updatedTtl = await this.redis.ttl(sessionKey);

    // ─── Все сессии пользователя ──────────────────────────────────────────
    const allUserSessions = await this.redis.smembers(userSessionsKey);

    // ─── Logout: удаление конкретной сессии ──────────────────────────────
    const deleted = await this.redis.del(sessionKey);
    await this.redis.srem(userSessionsKey, sessionId);

    // После удаления
    const afterLogout = await this.redis.hgetall(sessionKey);

    // Очистка
    await this.redis.del(userSessionsKey);

    this.logger.log(
      `[STEP-18] Session: ${sessionId} created for user ${userId}, deleted=${deleted}`,
    );

    return {
      step: 18,
      concept: 'Session Management — Hash + TTL + EXPIRE refresh pattern',
      commands: [
        'HSET',
        'HGETALL',
        'HINCRBY',
        'EXPIRE (refresh)',
        'SADD (track sessions)',
        'DEL (logout)',
      ],
      results: {
        sessionId,
        creation: { session, ttlSeconds: ttl },
        afterRefresh: { session: updatedSession, ttlSeconds: updatedTtl },
        userSessions: allUserSessions,
        logout: {
          deleted: deleted === 1,
          afterLogout:
            Object.keys(afterLogout).length === 0
              ? 'сессия удалена'
              : afterLogout,
        },
      },
      patterns: {
        singleDeviceLogout: 'DEL session:sessionId',
        allDevicesLogout: 'SMEMBERS user:id:sessions → DEL each → DEL set',
        sessionRefresh: 'EXPIRE session:id 1800 при каждом запросе',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 19: LEADERBOARD — Полная система рейтингов
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Leaderboard на Sorted Sets — классический Redis use-case
   *
   * Sorted Set идеально подходит для рейтинговых таблиц:
   *   - ZADD game:leaderboard score userId — O(log N)
   *   - ZREVRANK — позиция игрока — O(log N)
   *   - ZREVRANGE 0 9 WITHSCORES — топ-10 — O(log N + 10)
   *   - ZINCRBY — начислить очки — O(log N)
   *
   * Проблема "игроки вокруг меня":
   *   Нужно показать игроков с позиций rank-2 до rank+2.
   *   1. ZREVRANK → узнать свой rank
   *   2. ZREVRANGE rank-2 rank+2 WITHSCORES → игроки вокруг
   *
   * Это невозможно сделать эффективно в реляционной БД без специального индекса!
   * В Redis — две O(log N) операции.
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как обработать ничью (два игрока с одинаковым score)?"
   *   A: Redis разрешает ничью по лексикографическому порядку member.
   *      Для строгого tie-breaking: score = points * 1e12 + (maxTime - timestamp)
   *      Более раннее достижение score = меньше timestamp = выше rank.
   *
   * curl http://localhost:3000/redis/learn/19-leaderboard
   */
  @Get('19-leaderboard')
  async step19Leaderboard() {
    const lbKey = 'redis:learn:leaderboard:game';

    // ─── Наполнение рейтинга ──────────────────────────────────────────────
    const players = [
      { name: 'player:alice', score: 9850 },
      { name: 'player:bob', score: 8200 },
      { name: 'player:charlie', score: 12500 },
      { name: 'player:diana', score: 11100 },
      { name: 'player:eve', score: 7300 },
      { name: 'player:frank', score: 15200 },
      { name: 'player:grace', score: 9100 },
      { name: 'player:henry', score: 6800 },
      { name: 'player:iris', score: 13700 },
      { name: 'player:jack', score: 8750 },
      { name: 'player:kate', score: 10300 },
      { name: 'player:leo', score: 5500 },
    ];

    for (const player of players) {
      await this.redis.zadd(lbKey, player.score, player.name);
    }

    // ─── Топ-10 игроков ───────────────────────────────────────────────────
    const top10Raw = await this.redis.zrevrange(lbKey, 0, 9, 'WITHSCORES');
    // Преобразуем плоский массив [name, score, name, score] в [{name, score}]
    const top10 = [];
    for (let i = 0; i < top10Raw.length; i += 2) {
      top10.push({
        rank: i / 2 + 1,
        player: top10Raw[i],
        score: parseInt(top10Raw[i + 1]),
      });
    }

    // ─── Позиция конкретного игрока ───────────────────────────────────────
    const targetPlayer = 'player:alice';
    const rank = await this.redis.zrevrank(lbKey, targetPlayer); // 0-based
    const score = await this.redis.zscore(lbKey, targetPlayer);
    const totalPlayers = await this.redis.zcard(lbKey);

    // ─── Игроки вокруг Alice (rank ± 2) ──────────────────────────────────
    const startRank = Math.max(0, (rank ?? 0) - 2);
    const endRank = (rank ?? 0) + 2;
    const nearbyRaw = await this.redis.zrevrange(
      lbKey,
      startRank,
      endRank,
      'WITHSCORES',
    );
    const nearby = [];
    for (let i = 0; i < nearbyRaw.length; i += 2) {
      nearby.push({
        rank: startRank + i / 2 + 1,
        player: nearbyRaw[i],
        score: parseInt(nearbyRaw[i + 1]),
        isTarget: nearbyRaw[i] === targetPlayer,
      });
    }

    // ─── Начислить очки и обновить рейтинг ───────────────────────────────
    const newScore = await this.redis.zincrby(lbKey, 2000, targetPlayer);
    const newRank = await this.redis.zrevrank(lbKey, targetPlayer);

    // ─── Игроки в диапазоне очков ─────────────────────────────────────────
    const midTier = await this.redis.zrangebyscore(lbKey, 8000, 12000);

    // Очистка
    await this.redis.del(lbKey);

    this.logger.log(
      `[STEP-19] Leaderboard: ${totalPlayers} players, alice rank=${rank} → ${newRank}`,
    );

    return {
      step: 19,
      concept:
        'Full Leaderboard — ZADD, ZREVRANGE, ZREVRANK, ZINCRBY, ZRANGEBYSCORE',
      commands: [
        'ZADD',
        'ZREVRANGE WITHSCORES',
        'ZREVRANK',
        'ZSCORE',
        'ZINCRBY',
        'ZRANGEBYSCORE',
        'ZCARD',
      ],
      results: {
        top10,
        aliceStats: {
          player: targetPlayer,
          score: parseInt(score ?? '0'),
          rank: (rank ?? 0) + 1, // 1-indexed для отображения
          totalPlayers,
          percentile: `Топ ${(((rank ?? 0) / totalPlayers) * 100).toFixed(1)}%`,
        },
        playersNearAlice: nearby,
        afterAddingPoints: {
          pointsAdded: 2000,
          newScore: parseInt(newScore),
          newRank: (newRank ?? 0) + 1,
          rankImprovement: (rank ?? 0) - (newRank ?? 0),
        },
        midTierPlayers: {
          scoreRange: '8000-12000',
          players: midTier,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ШАГ 20: MEMORY INFO — Статистика и метрики Redis
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎓 КОНЦЕПЦИЯ: Мониторинг Redis — INFO, DBSIZE, MEMORY USAGE
   *
   * Команды для мониторинга и диагностики:
   *
   * INFO — получить разделы статистики:
   *   server:    версия, uptime, порт
   *   memory:    используемая память, maxmemory, фрагментация
   *   stats:     total commands, hits/misses, evictions
   *   keyspace:  количество ключей по базам данных, TTL статистика
   *   clients:   подключённые клиенты, блокированные
   *   replication: роль (master/replica), отставание replica
   *
   * Ключевые метрики:
   *   used_memory_human — реально занятая память
   *   mem_fragmentation_ratio — > 1.5 = проблема фрагментации
   *   keyspace_hits/keyspace_misses → hit rate = hits/(hits+misses)
   *   evicted_keys — ключи выселенные из-за maxmemory
   *   connected_clients — подключённые клиенты
   *   instantaneous_ops_per_sec — ops/sec прямо сейчас
   *
   * ⚠️ ЛОВУШКА ИНТЕРВЬЮ:
   *   Q: "Как проверить hit rate кэша в Redis?"
   *   A: INFO stats → keyspace_hits / (keyspace_hits + keyspace_misses) * 100
   *      Нормальный hit rate > 80-90%. Ниже → стоит пересмотреть стратегию TTL.
   *
   * curl http://localhost:3000/redis/learn/20-memory-info
   */
  @Get('20-memory-info')
  async step20MemoryInfo() {
    // ─── INFO — получить статистику ───────────────────────────────────────
    const infoMemory = await this.redis.info('memory');
    const infoServer = await this.redis.info('server');
    const infoStats = await this.redis.info('stats');
    const infoKeyspace = await this.redis.info('keyspace');
    const infoClients = await this.redis.info('clients');

    // Парсим нужные строки из INFO
    const parseInfo = (infoStr: string): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const line of infoStr.split('\r\n')) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value !== undefined) result[key.trim()] = value.trim();
        }
      }
      return result;
    };

    const memory = parseInfo(infoMemory);
    const server = parseInfo(infoServer);
    const stats = parseInfo(infoStats);
    const keyspace = parseInfo(infoKeyspace);
    const clients = parseInfo(infoClients);

    // ─── DBSIZE — количество ключей ───────────────────────────────────────
    const dbSize = await this.redis.dbsize();

    // ─── MEMORY USAGE — точный размер конкретного ключа ──────────────────
    // Создаём тестовые ключи для демонстрации
    const smallKey = 'redis:learn:mem:small';
    const largeKey = 'redis:learn:mem:large';
    const hashKey = 'redis:learn:mem:hash';

    await this.redis.set(smallKey, 'hello');
    await this.redis.set(largeKey, 'x'.repeat(1000));
    await this.redis.hset(hashKey, {
      f1: 'v1',
      f2: 'v2',
      f3: 'v3',
      f4: 'v4',
      f5: 'v5',
    });

    const smallMemUsage = await this.redis.memory('USAGE', smallKey);
    const largeMemUsage = await this.redis.memory('USAGE', largeKey);
    const hashMemUsage = await this.redis.memory('USAGE', hashKey);

    // ─── Hit Rate Calculation ─────────────────────────────────────────────
    const hits = parseInt(stats.keyspace_hits ?? '0');
    const misses = parseInt(stats.keyspace_misses ?? '0');
    const hitRate =
      hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) : 'N/A';

    // Очистка
    await this.redis.del(smallKey, largeKey, hashKey);

    this.logger.log(
      `[STEP-20] Memory: ${memory.used_memory_human}, dbSize=${dbSize}, hitRate=${hitRate}%`,
    );

    return {
      step: 20,
      concept:
        'Memory & Stats — INFO memory/server/stats/keyspace, DBSIZE, MEMORY USAGE',
      commands: [
        'INFO memory',
        'INFO server',
        'INFO stats',
        'INFO keyspace',
        'DBSIZE',
        'MEMORY USAGE key',
      ],
      results: {
        server: {
          version: server.redis_version,
          uptime: `${Math.floor(parseInt(server.uptime_in_seconds ?? '0') / 3600)}h`,
          mode: server.redis_mode,
          os: server.os,
        },
        memory: {
          used: memory.used_memory_human,
          peak: memory.used_memory_peak_human,
          maxMemory:
            memory.maxmemory_human !== '0B'
              ? memory.maxmemory_human
              : 'не ограничена',
          maxMemoryPolicy: memory.maxmemory_policy,
          fragmentationRatio: memory.mem_fragmentation_ratio,
          fragmentationWarning:
            parseFloat(memory.mem_fragmentation_ratio ?? '1') > 1.5
              ? '⚠️ Высокая фрагментация! Рассмотри MEMORY PURGE'
              : '✅ Фрагментация в норме',
        },
        performance: {
          totalCommandsProcessed: stats.total_commands_processed,
          instantaneousOpsPerSec: stats.instantaneous_ops_per_sec,
          connectedClients: clients.connected_clients,
          evictedKeys: stats.evicted_keys,
          hitRate: `${hitRate}%`,
          hitsVsMisses: { hits, misses },
        },
        keyspace: {
          dbSize,
          databases: keyspace,
        },
        memoryPerKey: {
          smallString5bytes: `${smallMemUsage} bytes`,
          largeString1000bytes: `${largeMemUsage} bytes`,
          hashWith5Fields: `${hashMemUsage} bytes`,
        },
        allStepsCompleted: {
          message: '🎉 Поздравляем! Ты прошёл все 20 шагов Redis обучения!',
          topics: [
            '✅ Базовые операции (PING, SET, GET)',
            '✅ Строки, Списки, Хэши, Множества, Сортированные множества',
            '✅ TTL и истечение ключей',
            '✅ Cache-Aside паттерн',
            '✅ Pipelining и Транзакции',
            '✅ Lua-скрипты',
            '✅ Distributed Locks',
            '✅ Rate Limiting',
            '✅ Pub/Sub',
            '✅ HyperLogLog и Bitmaps',
            '✅ Геопространственные данные',
            '✅ Управление сессиями',
            '✅ Leaderboard',
            '✅ Мониторинг и метрики',
          ],
        },
      },
    };
  }
}
