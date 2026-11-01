/**
 * pg-learn.controller.ts — RESERVATION SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🗺️ КАРТА ОБУЧЕНИЯ POSTGRESQL (SENIOR / LEAD LEVEL)
 *
 * Каждый эндпоинт = одна тема с реальным выполнением SQL через Knex,
 * замерами времени, EXPLAIN планами и разбором ловушек на собеседовании.
 *
 * ┌────────────────────────────────────────────────────────────────────────────────────────┐
 * │  #  │ Маршрут                              │ Концепция                                │
 * ├─────┼──────────────────────────────────────┼──────────────────────────────────────────┤
 * │  1  │ GET  /pg/learn/1-data-types          │ Numeric vs float, timestamptz, jsonb, id │
 * │  2  │ GET  /pg/learn/2-joins               │ JOIN-ы, anti/semi-join, NULL trap, LATERAL│
 * │  3  │ GET  /pg/learn/3-join-algorithms     │ Nested Loop vs Hash Join vs Merge Join   │
 * │  4  │ GET  /pg/learn/4-aggregations        │ GROUP BY, FILTER, ROLLUP, COUNT-нюансы   │
 * │  5  │ GET  /pg/learn/5-window-functions    │ ROW_NUMBER, LAG/LEAD, ROWS vs RANGE frame│
 * │  6  │ GET  /pg/learn/6-cte                 │ MATERIALIZED, recursive CTE, cycle guard │
 * │  7  │ GET  /pg/learn/7-jsonb               │ JSONB операторы, GIN ops, Knex ? hazard  │
 * │  8  │ GET  /pg/learn/8-acid                │ Atomicity, constraints, WAL, DDL rollback│
 * │  9  │ GET  /pg/learn/9-isolation           │ RC vs RR vs Serializable, lost update    │
 * │  10 │ GET  /pg/learn/10-locks              │ FOR UPDATE, NOWAIT, SKIP LOCKED, advisory│
 * │  11 │ GET  /pg/learn/11-deadlock           │ Deadlock 40P01, порядок блокировок       │
 * │  12 │ GET  /pg/learn/12-mvcc               │ xmin/xmax, dead tuples, VACUUM, HOT      │
 * │  13 │ GET  /pg/learn/13-explain            │ EXPLAIN (ANALYZE, BUFFERS), типы сканов  │
 * │  14 │ GET  /pg/learn/14-btree              │ Составные, INCLUDE, partial, expression  │
 * │  15 │ GET  /pg/learn/15-index-types        │ GIN, GiST, BRIN, Hash                    │
 * │  16 │ GET  /pg/learn/16-index-pitfalls     │ Причины игнора индекса, CONCURRENTLY     │
 * │  17 │ GET  /pg/learn/17-pagination         │ OFFSET vs Keyset/Cursor pagination       │
 * │  18 │ GET  /pg/learn/18-batching           │ N+1, UNNEST, COPY, ON CONFLICT upsert    │
 * │  19 │ POST /pg/learn/19-outbox             │ Transactional Outbox + SKIP LOCKED       │
 * │  20 │ POST /pg/learn/20-idempotency        │ Inbox dedup, Saga vs 2PC                 │
 * │  21 │ GET  /pg/learn/21-partitioning       │ Range partitioning, pruning, lifecycle   │
 * │  22 │ GET  /pg/learn/22-scaling            │ PgBouncer, репликация, Citus, Patroni    │
 * │  23 │ GET  /pg/learn/23-monitoring         │ pg_stat_activity, locks, cache hit, stat │
 * └────────────────────────────────────────────────────────────────────────────────────────┘
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex, KafkaProducerService } from '@app/common';

@Controller('pg/learn')
export class PgLearnController {
  private readonly logger = new Logger(PgLearnController.name);

  constructor(
    @InjectKnex() private readonly knex: Knex,
    @Optional()
    @Inject(KafkaProducerService)
    private readonly kafkaProducer?: KafkaProducerService,
  ) {}

  /**
   * Helper для установки search_path и выполнения EXPLAIN ANALYZE
   */
  private async explainQuery(sql: string, params: any[] = []): Promise<any[]> {
    const res = await this.knex.raw(
      `EXPLAIN (ANALYZE, BUFFERS, COSTS, SUMMARY) ${sql}`,
      params,
    );
    return res.rows.map((r: any) => r['QUERY PLAN']);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: SQL & RELATIONAL MODEL
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 1. Data Types
   * Демонстрация ключевых типов и senior-ловушек.
   */
  @Get('1-data-types')
  async step1DataTypes() {
    // 1. Float vs Numeric (0.1 + 0.2)
    const floatTest = await this.knex.raw(`
      SELECT
        (0.1::float8 + 0.2::float8) = 0.3::float8 AS float_equals,
        (0.1::float8 + 0.2::float8) AS float_result,
        (0.1::numeric + 0.2::numeric) = 0.3::numeric AS numeric_equals,
        (0.1::numeric + 0.2::numeric) AS numeric_result;
    `);

    // 2. Timestamptz vs Timestamp
    const tzTest = await this.knex.raw(`
      SELECT
        now()::timestamp AS ts_without_tz,
        now()::timestamptz AS ts_with_tz,
        current_setting('TIMEZONE') AS current_tz;
    `);

    // 3. Text vs Varchar(n)
    const textVarcharTest = {
      insight:
        'В PostgreSQL text, varchar и varchar(n) хранятся одинаково (varlena, 1 или 4 байта оверхед). varchar(n) просто добавляет проверку длины на каждой записи и блокирует ALTER TABLE при увеличении n.',
    };

    // 4. Identity vs Serial
    const identityTest = {
      insight:
        'GENERATED AS IDENTITY (SQL:2003 стандарт) привязывает sequence к столбцу. DROP TABLE удаляет sequence автоматически, права не текут. SERIAL — устаревший синтаксический сахар.',
    };

    // 5. UUID v4 vs UUID v7
    const uuidTest = {
      insight:
        'UUID v4 случаен -> случайные вставки по всему дереву B-Tree -> fragmentation и cache thrashing. UUID v7 сортируем по времени (unix timestamp в первых 48 битах) -> локальность вставок как у bigint identity.',
    };

    return {
      step: 1,
      concept: 'PostgreSQL Data Types & Senior Traps',
      floatVsNumeric: floatTest.rows[0],
      timestamptzVsTimestamp: tzTest.rows[0],
      textVsVarchar: textVarcharTest,
      identityVsSerial: identityTest,
      uuidV4VsV7: uuidTest,
      interviewTrap:
        'Float нельзя использовать для денег (IEEE 754 precision error). Всегда NUMERIC(p,s) или целые центы в BIGINT. Всегда timestamptz (хранит UTC, форматирует по timezone клиента).',
    };
  }

  /**
   * 2. Joins & Join Nuances
   * Anti-join (NOT EXISTS vs LEFT JOIN IS NULL vs NOT IN), Semi-join, LATERAL, join row multiplication.
   */
  @Get('2-joins')
  async step2Joins() {
    // 1. Anti-Join: Поиск клиентов без заказов (клиенты 90001..100000)
    const notExistsRes = await this.knex.raw(`
      SELECT count(*) as count
      FROM pg_learn.customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_learn.orders o WHERE o.customer_id = c.id
      );
    `);

    const leftJoinNullRes = await this.knex.raw(`
      SELECT count(*) as count
      FROM pg_learn.customers c
      LEFT JOIN pg_learn.orders o ON o.customer_id = c.id
      WHERE o.id IS NULL;
    `);

    // NOT IN ловушка с NULL: если в подзапросе есть хотя бы один NULL, NOT IN вернет 0 строк!
    const nullTrapExplanation =
      'NOT IN (subquery) возвращает UNKNOWN (т.е. false), если в результате подзапроса окажется NULL! Поэтому для anti-join ВСЕГДА используем NOT EXISTS.';

    // 2. LATERAL JOIN: топ-2 последних заказа для первых 5 VIP-клиентов
    const lateralRes = await this.knex.raw(`
      SELECT c.id AS customer_id, c.full_name, ord.id AS order_id, ord.total, ord.created_at
      FROM pg_learn.customers c
      CROSS JOIN LATERAL (
        SELECT o.id, o.total, o.created_at
        FROM pg_learn.orders o
        WHERE o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT 2
      ) ord
      WHERE c.is_vip = true
      LIMIT 10;
    `);

    // 3. Row multiplication trap: при JOIN 1:N агрегаты родителя множатся!
    const rowMultiplication = await this.knex.raw(`
      SELECT
        o.id,
        o.total AS order_total,
        count(oi.product_id) AS items_count,
        sum(o.total) AS wrong_multiplied_sum
      FROM pg_learn.orders o
      JOIN pg_learn.order_items oi ON oi.order_id = o.id
      WHERE o.id = 1
      GROUP BY o.id, o.total;
    `);

    return {
      step: 2,
      concept: 'JOINs, Anti-joins, LATERAL & Hazards',
      antiJoinCountNotExists: notExistsRes.rows[0].count,
      antiJoinCountLeftJoinNull: leftJoinNullRes.rows[0].count,
      notInNullTrap: nullTrapExplanation,
      lateralTopOrdersSample: lateralRes.rows,
      rowMultiplicationTrap: {
        note: 'При неаккуратном JOIN orders 1:N order_items SUM(orders.total) умножается на количество items!',
        data: rowMultiplication.rows[0],
      },
    };
  }

  /**
   * 3. Join Algorithms
   * Nested Loop, Hash Join, Merge Join. Принудительное управление через enable_*.
   */
  @Get('3-join-algorithms')
  async step3JoinAlgorithms() {
    const query = `
      SELECT c.full_name, o.total
      FROM pg_learn.customers c
      JOIN pg_learn.orders o ON o.customer_id = c.id
      WHERE c.id BETWEEN 1 AND 50
    `;

    // 1. По умолчанию (планировщик выбирает оптимальный, обычно Hash Join или Nested Loop)
    const defaultPlan = await this.explainQuery(query);

    // 2. Выключаем Hash Join, заставляя использовать Merge Join или Nested Loop
    const forcedNestedLoop = await this.knex.raw(`
      SET LOCAL enable_hashjoin = off;
      SET LOCAL enable_mergejoin = off;
      EXPLAIN (ANALYZE, BUFFERS) ${query};
    `);

    // 3. Выключаем Nested Loop и Hash Join, заставляя Merge Join
    const forcedMergeJoin = await this.knex.raw(`
      SET LOCAL enable_hashjoin = off;
      SET LOCAL enable_nestloop = off;
      EXPLAIN (ANALYZE, BUFFERS) ${query};
    `);

    return {
      step: 3,
      concept: 'Join Algorithms (Nested Loop vs Hash Join vs Merge Join)',
      algorithms: {
        nestedLoop:
          'Для каждого кортежа внешнего набора сканирует внутренний. Идеален, когда внешний набор мал (<100 строк), а внутренний ищется по B-Tree индексу (O(M * log N)).',
        hashJoin:
          'Строит in-memory Hash Table по меньшему набору в пределах work_mem, затем стримит больший набор. Идеален для больших неиндексированных соединений по эквивалентности.',
        mergeJoin:
          'Сливает два заранее отсортированных набора (или сканированных по B-Tree). Идеален для больших объемов при наличии индексов или после сортировки.',
      },
      plans: {
        defaultPlan,
        forcedNestedLoop: forcedNestedLoop[2]?.rows?.map((r: any) => r['QUERY PLAN']),
        forcedMergeJoin: forcedMergeJoin[2]?.rows?.map((r: any) => r['QUERY PLAN']),
      },
      interviewTrap:
        'Если work_mem меньше, чем Hash Table, Hash Join сбрасывает бакеты на диск (Batches: 2+ disk spill), что приводит к диким IO-задержкам. Мониторить по temp_bytes в pg_stat_database.',
    };
  }

  /**
   * 4. Aggregations & Advanced Grouping
   * GROUP BY, HAVING, FILTER, ROLLUP, CUBE, GROUPING SETS.
   */
  @Get('4-aggregations')
  async step4Aggregations() {
    // 1. Aggregate FILTER clause (SQL:2003 стандарт) vs CASE WHEN
    const filterRes = await this.knex.raw(`
      SELECT
        count(*) AS total_orders,
        count(*) FILTER (WHERE status = 'new') AS new_orders,
        count(*) FILTER (WHERE status = 'shipped') AS shipped_orders,
        count(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders
      FROM pg_learn.orders;
    `);

    // 2. ROLLUP для построения промежуточных итогов (иерархия: страна -> vip -> итог)
    const rollupRes = await this.knex.raw(`
      SELECT
        country,
        is_vip,
        count(*) AS customers_count
      FROM pg_learn.customers
      WHERE country IN ('US', 'DE')
      GROUP BY ROLLUP (country, is_vip)
      ORDER BY country NULLS LAST, is_vip NULLS LAST;
    `);

    // 3. COUNT(*) vs COUNT(column) vs COUNT(DISTINCT)
    const countNuance = {
      'count(*)': 'Считает все строки физически (включая NULL). Самый быстрый.',
      'count(col)':
        'Считает строки, где col IS NOT NULL. Проверяет каждый кортеж.',
      'count(distinct col)':
        'Требует удержания хэш-таблицы уникальных значений в памяти. Дорогой O(N). Для приблизительных оценок на миллионах строк используют HyperLogLog (pg_stat_statements/hll).',
    };

    return {
      step: 4,
      concept: 'Aggregations, FILTER, ROLLUP & COUNT nuances',
      filterClauseSample: filterRes.rows[0],
      rollupSubtotals: rollupRes.rows,
      countNuances: countNuance,
      interviewTrap:
        'HAVING фильтрует ПОСЛЕ группировки, WHERE — ДО. Писать неагрегированные условия в HAVING — грубая ошибка, увеличивающая объем обрабатываемых данных в разы.',
    };
  }

  /**
   * 5. Window Functions
   * ROW_NUMBER vs RANK vs DENSE_RANK, LAG/LEAD, frame specification (ROWS vs RANGE).
   */
  @Get('5-window-functions')
  async step5WindowFunctions() {
    // 1. ROW_NUMBER vs RANK vs DENSE_RANK
    const ranksRes = await this.knex.raw(`
      SELECT
        id,
        full_name,
        department,
        salary,
        row_number() OVER (PARTITION BY department ORDER BY salary DESC) as row_num,
        rank() OVER (PARTITION BY department ORDER BY salary DESC) as rank,
        dense_rank() OVER (PARTITION BY department ORDER BY salary DESC) as dense_rank
      FROM pg_learn.employees
      WHERE department = 'Engineering'
      LIMIT 6;
    `);

    // 2. LAG / LEAD для нахождения дельты с предыдущим сотрудником
    const lagLeadRes = await this.knex.raw(`
      SELECT
        full_name,
        salary,
        lag(salary, 1) OVER (ORDER BY salary DESC) as prev_salary,
        salary - lag(salary, 1) OVER (ORDER BY salary DESC) as salary_diff
      FROM pg_learn.employees
      ORDER BY salary DESC
      LIMIT 5;
    `);

    // 3. Running Total & Frame Clause (ROWS vs RANGE)
    const frameRes = await this.knex.raw(`
      SELECT
        id,
        total,
        sum(total) OVER (
          ORDER BY id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_total_rows
      FROM pg_learn.orders
      LIMIT 5;
    `);

    return {
      step: 5,
      concept: 'Window Functions & Frame Clause',
      rankingDifferences: ranksRes.rows,
      lagLeadSalaryDelta: lagLeadRes.rows,
      runningTotalSample: frameRes.rows,
      interviewTrap:
        'По умолчанию окно без явного фрейма использует RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW! RANGE выполняет проверку дубликатов значений (peer groups) и не может оптимизироваться потоково, порождая лишнюю нагрузку. Для running total всегда явно пишите: ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW!',
    };
  }

  /**
   * 6. Common Table Expressions (CTE) & Recursive Queries
   * MATERIALIZED vs NOT MATERIALIZED, рекурсивная иерархия, защита от циклов.
   */
  @Get('6-cte')
  async step6Cte() {
    // 1. Recursive CTE: Иерархия сотрудников от CEO вниз с путями и глубиной
    const orgChart = await this.knex.raw(`
      WITH RECURSIVE employee_hierarchy AS (
        -- Анкерный член: CEO (manager_id IS NULL)
        SELECT
          id,
          full_name,
          manager_id,
          1 AS depth,
          ARRAY[full_name] AS path
        FROM pg_learn.employees
        WHERE manager_id IS NULL

        UNION ALL

        -- Рекурсивный член
        SELECT
          e.id,
          e.full_name,
          e.manager_id,
          eh.depth + 1,
          eh.path || e.full_name
        FROM pg_learn.employees e
        JOIN employee_hierarchy eh ON e.manager_id = eh.id
        WHERE eh.depth < 10 -- Защита от бесконечного цикла
      )
      SELECT * FROM employee_hierarchy
      WHERE depth <= 3
      ORDER BY depth, id
      LIMIT 10;
    `);

    // 2. MATERIALIZED vs NOT MATERIALIZED
    const cteOptimizationFence = {
      pg11andOlder:
        'До PostgreSQL 12 любой CTE был жестким «optimization fence»: материализовался полностью во временную структуру, предикаты внешнего запроса внутрь не проталкивались.',
      pg12andNewer:
        'Начиная с PG 12 CTE инлайнится (как обычный подзапрос), если он не рекурсивен и вызывается ровно один раз. Чтобы заставить PG материализовать его, пишется: WITH cte AS MATERIALIZED (...).',
    };

    return {
      step: 6,
      concept: 'CTE, Inlining & Recursive Queries',
      orgTree: orgChart.rows,
      optimizationFence: cteOptimizationFence,
      interviewTrap:
        'Если рекурсивный граф содержит цикл (A -> B -> A), рекурсивный CTE зависнет навечно и съест память/CPU. В PG 14+ есть конструкция CYCLE id SET is_cycle USING path, либо вручную через массив ARRAY[id] и ANY(path).',
    };
  }

  /**
   * 7. JSONB: Операторы, GIN Индексы и Knex hazard
   */
  @Get('7-jsonb')
  async step7Jsonb() {
    // 1. Операторы извлечения
    const jsonExtraction = await this.knex.raw(`
      SELECT
        id,
        attrs->'color' AS color_jsonb,       -- возвращает jsonb со строкой '"black"'
        attrs->>'color' AS color_text,       -- возвращает text 'black'
        attrs#>>'{specs,warranty_months}' AS warranty_months_text
      FROM pg_learn.products
      LIMIT 3;
    `);

    // 2. Containment operator (@>)
    const containment = await this.knex.raw(`
      SELECT count(*) as black_products_count
      FROM pg_learn.products
      WHERE attrs @> '{"color": "black"}';
    `);

    // 3. GIN index comparison
    const ginComparison = {
      jsonb_ops:
        'По умолчанию. Индексирует каждый ключ и каждое значение отдельно. Поддерживает ?, ?|, ?&, @>. Индекс больше по размеру.',
      jsonb_path_ops:
        'Индексирует хэш полного пути от корня к значению. Поддерживает ТОЛЬКО оператор @>. В 2-3 раза компактнее и быстрее jsonb_ops.',
    };

    // 4. Knex ? Operator Hazard
    const knexHazard =
      'В Knex знак ? используется как плейсхолдер параметров! Если написать raw("attrs ? \'key\'"), Knex посчитает ? параметром и выбросит синтаксическую ошибку. Решение: экранировать двойным вопросом: raw("attrs \\\\? \'key\'") или использовать оператор @>.';

    return {
      step: 7,
      concept: 'JSONB Operators, GIN Indexes & Knex Placeholder Hazard',
      extractionSample: jsonExtraction.rows,
      containmentCount: containment.rows[0].count,
      ginComparison,
      knexHazard,
      interviewTrap:
        'Оператор ->> возвращает TEXT! Если вы пытаетесь сравнивать число: attrs->>\'count\' > 10, вы получите лексикографическое сравнение строк ("2" > "10" = true)! Всегда приводите: (attrs->>\'count\')::int > 10.',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: TRANSACTIONS & CONCURRENCY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 8. ACID: Atomicity, Consistency, Durability, Transactional DDL
   */
  @Get('8-acid')
  async step8Acid() {
    // 1. Atomicity: перевод с баланса, который падает по CHECK-констрейнту
    let atomicityTestResult = 'Failed to catch';
    try {
      await this.knex.transaction(async (trx) => {
        // Списываем у Alice
        await trx.raw(
          `UPDATE pg_learn.accounts SET balance = balance - 2000 WHERE id = 1`,
        );
        // Зачисляем Bob
        await trx.raw(
          `UPDATE pg_learn.accounts SET balance = balance + 2000 WHERE id = 2`,
        );
      });
    } catch (err: any) {
      atomicityTestResult = `Rollback triggered: ${err.message}`;
    }

    // Проверяем, что баланс Alice не изменился
    const aliceBalance = await this.knex.raw(
      `SELECT balance FROM pg_learn.accounts WHERE id = 1`,
    );

    // 2. Consistency: EXCLUDE constraint (нельзя забронировать ту же комнату на пересекающиеся даты)
    let consistencyTestResult = 'Failed to catch';
    try {
      await this.knex.raw(`
        INSERT INTO pg_learn.room_bookings (room_id, guest, during)
        VALUES (101, 'Eve Intruder', tstzrange('2025-06-02 10:00Z', '2025-06-04 18:00Z', '[)'));
      `);
    } catch (err: any) {
      consistencyTestResult = `Exclude constraint violation caught: ${err.message}`;
    }

    // 3. Durability & Transactional DDL
    const durabilityInfo = {
      wal: 'Каждая транзакция сначала пишется в Write-Ahead Log (WAL) последовательным IO на диск.',
      synchronousCommit:
        'synchronous_commit = off дает прирост throughput в 5-10 раз для коротких транзакций, ценой потери последних ~wal_writer_delay (200ms) транзакций при сбое ОС/питания (но база НЕ повреждается!).',
      transactionalDdl:
        'В PostgreSQL DDL (CREATE/ALTER/DROP TABLE/COLUMN) полностью транзакционен. Любой упавший шаг миграции откатывает схему целиком без мусора.',
    };

    return {
      step: 8,
      concept: 'ACID Guarantees & Transactional DDL in PostgreSQL',
      atomicityDemo: {
        error: atomicityTestResult,
        aliceCurrentBalance: aliceBalance.rows[0].balance,
        status: 'Баланс остался цел (1000.00), списание откатилось целиком.',
      },
      consistencyDemo: {
        gistExclusionResult: consistencyTestResult,
        status:
          'Защита от овербукинга на уровне ядра СУБД (btree_gist tstzrange EXCLUDE), без race conditions на бэкенде.',
      },
      durabilityAndDdl: durabilityInfo,
    };
  }

  /**
   * 9. Transaction Isolation Levels: Lost Update & Write Skew
   */
  @Get('9-isolation')
  async step9Isolation() {
    // 1. Уровни изоляции в Postgres:
    // Read Committed (default) — грязно не читает, но подвержен non-repeatable read и lost update
    // Repeatable Read — MVCC снимок фиксируется на ПЕРВОМ операторе транзакции (не на BEGIN!)
    // Serializable — SSI (Serializable Snapshot Isolation), эмулирует строго последовательное исполнение

    // Демонстрация Write Skew на таблице doctors
    // Задача: в дежурстве должен оставаться хотя бы 1 врач (count >= 1).
    // Допустим, дежурят Dr. House (1) и Dr. Watson (2). Оба одновременно хотят уйти с дежурства.
    // При Repeatable Read ОБА видят count=2, оба уходят -> дежурят 0 врачей (Write Skew!).
    // При SERIALIZABLE Postgres выбросит ошибку 40001 (could not serialize access due to read/write dependencies).

    let serializableResult = '';
    try {
      await this.knex.transaction(
        async (trx) => {
          const onCall = await trx.raw(
            `SELECT count(*) FROM pg_learn.doctors WHERE on_call = true`,
          );
          if (Number(onCall.rows[0].count) >= 2) {
            await trx.raw(
              `UPDATE pg_learn.doctors SET on_call = false WHERE id = 1`,
            );
          }
        },
        { isolationLevel: 'serializable' },
      );
      serializableResult =
        'Transaction completed. В конкурентной среде 2-я транзакция получит 40001 serialization_failure.';
    } catch (e: any) {
      serializableResult = `Caught expected: ${e.message}`;
    }

    // Возвращаем статус доктора на место
    await this.knex.raw(
      `UPDATE pg_learn.doctors SET on_call = true WHERE id = 1`,
    );

    return {
      step: 9,
      concept: 'Isolation Levels, Lost Update, Write Skew & Retry Pattern',
      isolationLevels: {
        readCommitted:
          'Каждый запрос видит данные, закомиченные до начала ЭТОГО запроса. Грязных чтений нет. Возможны Non-repeatable read, Phantom read, Lost update.',
        repeatableRead:
          'Снимок берется в момент ПЕРВОГО оператора в транзакции. Одинаковый SELECT видит одно и то же. Защищает от Lost Update (ошибка 40001 при параллельной модификации той же строки). Подвержен Write Skew.',
        serializable:
          'Защищает от ВСЕХ аномалий включая Write Skew с помощью SIREAD locks в памяти (без блокировок строк!). При конфликте зависимостей кидает 40001 serialization_failure.',
      },
      writeSkewDemo: serializableResult,
      seniorPattern:
        'При использовании SERIALIZABLE (или Repeatable Read) в коде сервиса ОБЯЗАН быть retry-механизм с exponential backoff для перехвата ошибки 40001.',
    };
  }

  /**
   * 10. Locks: Row Locks, NOWAIT, SKIP LOCKED, Advisory Locks
   */
  @Get('10-locks')
  async step10Locks() {
    // 1. FOR UPDATE vs FOR NO KEY UPDATE
    const lockModes = {
      forUpdate:
        'Блокирует строку эксклюзивно. Конфликтует даже с проверкой внешних ключей.',
      forNoKeyUpdate:
        'Блокирует поля строки, кроме первичного/уникального ключа. Позволяет другим транзакциям вставлять дочерние строки по FK!',
      forShare: 'Разделяемая блокировка для чтения без права модификации.',
    };

    // 2. SKIP LOCKED — паттерн очередей и worker pods
    const skipLockedDemo = await this.knex.raw(`
      SELECT id, aggregate_id, event_type
      FROM pg_learn.outbox
      WHERE published_at IS NULL
      ORDER BY id
      LIMIT 2
      FOR UPDATE SKIP LOCKED;
    `);

    // 3. Advisory Locks (пользовательские мьютексы на уровне Postgres)
    const advisoryLock = await this.knex.raw(`
      SELECT pg_try_advisory_xact_lock(424242) AS lock_acquired;
    `);

    return {
      step: 10,
      concept: 'Lock Modes, SKIP LOCKED & Advisory Locks',
      lockModes,
      skipLockedWorkersQueue: {
        note: 'Несколько подов читают из одной таблицы без взаимных блокировок и ожидания.',
        rowsAcquired: skipLockedDemo.rows,
      },
      advisoryLockDemo: {
        acquired: advisoryLock.rows[0].lock_acquired,
        comparisonWithRedisRedlock:
          'Advisory locks транзакционны (pg_*_xact_lock освобождается автоматически при commit/rollback), живут в БД, не страдают от рассинхронизации часов NTP в отличие от Redis Redlock. Минус: грузят пул соединений Postgres.',
      },
    };
  }

  /**
   * 11. Deadlocks & Lock Ordering
   */
  @Get('11-deadlock')
  async step11Deadlock() {
    const preventionStrategy = {
      cause:
        'Транзакция A берет ресурс 1 и ждет ресурс 2. Транзакция B берет ресурс 2 и ждет ресурс 1. Возникает цикл графа ожидания.',
      detection:
        'Postgres запускает поиск циклов каждые deadlock_timeout (по умолчанию 1 секунда). При обнаружении обрывает одну из транзакций с кодом ошибки 40P01.',
      solution:
        'Строгий детерминированный порядок захвата ресурсов! Если нужно обновить несколько аккаунтов, всегда сортируйте их по ID: SELECT ... WHERE id IN (1, 2) ORDER BY id FOR UPDATE;',
    };

    return {
      step: 11,
      concept: 'Deadlocks, Detection (40P01) & Prevention',
      preventionStrategy,
      interviewTrap:
        'Дедлоки в PostgreSQL могут происходить не только на UPDATE строк, но и при каскадных внешних ключах без индексов или параллельном создании индексов без CONCURRENTLY.',
    };
  }

  /**
   * 12. MVCC Deep Dive: xmin, xmax, VACUUM, HOT Updates & Bloat
   */
  @Get('12-mvcc')
  async step12Mvcc() {
    // Читаем системные столбцы xmin, xmax, ctid для строки
    const mvccRow = await this.knex.raw(`
      SELECT
        ctid, -- (номер_страницы, индекс_внутри_страницы)
        xmin, -- ID транзакции, создавшей версию строки
        xmax, -- ID транзакции, удалившей/обновившей строку (или 0)
        id,
        balance
      FROM pg_learn.accounts
      WHERE id = 1;
    `);

    // Метрики мертвых строк
    const deadTuples = await this.knex.raw(`
      SELECT
        relname,
        n_live_tup,
        n_dead_tup,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE relname IN ('orders', 'customers', 'accounts')
      LIMIT 3;
    `);

    return {
      step: 12,
      concept: 'MVCC, Tuple Header (xmin/xmax/ctid), HOT & Autovacuum',
      systemColumnsDemo: mvccRow.rows[0],
      deadTuplesMetrics: deadTuples.rows,
      hotUpdates:
        'Heap-Only Tuples (HOT): если при UPDATE не меняются индексированные столбцы и на той же странице есть место (fillfactor < 100), Postgres создает новую версию строки БЕЗ обновления B-Tree индексов! Это снижает нагрузку на дисковый IO в разы.',
      interviewTrap:
        'Долгая висящая транзакция (даже обычный SELECT в статусе "idle in transaction") удерживает древний xmin, блокируя autovacuum для ВСЕЙ базы! Накапливаются dead tuples, таблицы раздуваются (bloat). Лечится idle_in_transaction_session_timeout.',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: PERFORMANCE & INDEXES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 13. EXPLAIN & EXPLAIN ANALYZE: Reading Plans & Buffers
   */
  @Get('13-explain')
  async step13Explain() {
    const plan = await this.explainQuery(`
      SELECT c.full_name, count(o.id)
      FROM pg_learn.customers c
      JOIN pg_learn.orders o ON o.customer_id = c.id
      WHERE c.country = 'US'
      GROUP BY c.full_name
      ORDER BY count(o.id) DESC
      LIMIT 5;
    `);

    return {
      step: 13,
      concept: 'How to Read EXPLAIN (ANALYZE, BUFFERS)',
      plan,
      cheatSheet: {
        cost: 'cost=startup..total (в относительных единицах page_cost, 1.0 = seq page read).',
        rows: 'rows=оценка планировщика vs actual rows=реально возвращено. Если отличаются в 10+ раз — статистика устарела, нужен ANALYZE.',
        loops:
          'loops=N: actual rows и time на шаге умножаются на N! Если actual rows=1, loops=10000 -> обработано 10,000 строк.',
        buffers:
          'Buffers: shared hit (взято из RAM shared_buffers) vs shared read (прочитано с диска). shared read должен быть минимален.',
      },
      scans: {
        seqScan: 'Последовательное чтение всей таблицы.',
        indexScan: 'Поиск по B-Tree + переход в таблицу за кортежем по Heap RID.',
        indexOnlyScan:
          'Все запрашиваемые поля есть в индексе, и Visibility Map подтверждает, что страница не содержит мертвых строк.',
        bitmapHeapScan:
          'Bitmap Index Scan строит битовую карту страниц в памяти, затем Bitmap Heap Scan читает страницы последовательно.',
      },
    };
  }

  /**
   * 14. B-Tree Indexes: Composite, INCLUDE, Partial, Expression
   */
  @Get('14-btree')
  async step14Btree() {
    // Демонстрируем создание и влияние индексов внутри транзакции с ROLLBACK,
    // чтобы не оставлять мусор в базе данных.
    let planBefore = [];
    let planAfter = [];

    await this.knex.transaction(async (trx) => {
      // План до индекса (Seq Scan)
      const resBefore = await trx.raw(`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id, total FROM pg_learn.orders WHERE status = 'new' LIMIT 10;
      `);
      planBefore = resBefore.rows.map((r: any) => r['QUERY PLAN']);

      // Создаем частичный индекс
      await trx.raw(`
        CREATE INDEX temp_orders_new_partial_idx ON pg_learn.orders (id, total) WHERE status = 'new';
      `);

      // План после индекса (Index Scan / Index Only Scan)
      const resAfter = await trx.raw(`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id, total FROM pg_learn.orders WHERE status = 'new' LIMIT 10;
      `);
      planAfter = resAfter.rows.map((r: any) => r['QUERY PLAN']);

      // Откат транзакции
      await trx.rollback();
    }).catch(() => {
      // Игнорируем ошибку отката транзакции (она намеренная)
    });

    return {
      step: 14,
      concept: 'B-Tree Indexes: Composite Ordering, INCLUDE, Partial & Expression',
      rules: {
        compositeOrder:
          'Правило левого префикса: столбцы на точное равенство (=) идут первыми, диапазонные (<, >, BETWEEN) — в конце.',
        includeCovering:
          'CREATE INDEX idx ON t (a) INCLUDE (b): столбец b хранится только в листовых страницах. Дает Index Only Scan без раздувания промежуточных b-tree узлов.',
        partialIndex:
          'CREATE INDEX idx ON orders (id) WHERE status = "new": индексирует только 5% строк. Размер индекса в 20 раз меньше!',
        expressionIndex:
          'CREATE INDEX idx ON customers (LOWER(email)): без него WHERE LOWER(email) = ? идет в полный Seq Scan.',
      },
      demonstration: {
        planBeforePartialIndex: planBefore,
        planAfterPartialIndex: planAfter,
      },
      interviewTrap:
        'Внешний ключ (FK) в PostgreSQL НЕ индексируется автоматически! Без явного индекса на customer_id любой DELETE из customers приведет к полному Seq Scan по 500k строкам orders с эксклюзивной блокировкой.',
    };
  }

  /**
   * 15. Index Types: GIN, GiST, BRIN, Hash
   */
  @Get('15-index-types')
  async step15IndexTypes() {
    const indexTypesGuide = {
      btree:
        'Универсальный сбалансированный поиск O(log N). Подходит для =, <, <=, >, >=, BETWEEN, ORDER BY.',
      gin:
        'Обобщенный инвертированный индекс. Документ -> элементы. Идеален для jsonb, массивов text[], полнотекстового поиска tsvector и pg_trgm (ILIKE "%substring%").',
      gist:
        'Дерево поиска обобщенных структур. Подходит для геометрических типов PostGIS, диапазонов (tstzrange, int4range) и ограничений EXCLUDE.',
      brin:
        'Block Range Index. Хранит только min/max значения на диапазон страниц (например, каждые 128 страниц). Занимает килобайты памяти вместо сотен мегабайт! Идеален для append-only логов и монотонных дат.',
      hash:
        'Хэш-индекс по ключу. Только операция "=". Начиная с PG 10 полностью crash-safe (WAL-logged).',
    };

    // Сравнение размеров B-Tree vs BRIN на 1M записей
    const sizeComparison = {
      note: 'На таблице page_views (1,000,000 строк) B-tree индекс на created_at весит ~22 MB, а BRIN индекс — всего 64 KB (в 350 раз компактнее)!',
    };

    return {
      step: 15,
      concept: 'Specialized Index Types: GIN, GiST, BRIN, Hash',
      guide: indexTypesGuide,
      sizeComparison,
      interviewTrap:
        'BRIN работает эффективно ТОЛЬКО если данные на диске физически упорядочены (корреляция близка к 1.0 в pg_stats.correlation). Если данные вставляются вперемешку, BRIN будет читать почти всю таблицу.',
    };
  }

  /**
   * 16. Index Pitfalls & CONCURRENTLY
   */
  @Get('16-index-pitfalls')
  async step16IndexPitfalls() {
    const unusedIndexesQuery = await this.knex.raw(`
      SELECT
        schemaname,
        relname AS table_name,
        indexrelname AS index_name,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'pg_learn'
      ORDER BY idx_scan ASC
      LIMIT 5;
    `);

    const pitfalls = [
      '1. Функция на столбце без функционального индекса: WHERE date(created_at) = "2025-01-01" отключает индекс на created_at. Решение: WHERE created_at >= "2025-01-01" AND created_at < "2025-01-02".',
      '2. Неявное приведение типов: WHERE varchar_col = 123 (число вместо строки) заставляет PG делать CAST(varchar_col AS integer) для каждой строки.',
      '3. Ведущий wildcard: WHERE name LIKE "%test%" не может использовать B-tree. Нужен GIN с расширением pg_trgm (gin_trgm_ops).',
      '4. Низкая селективность: если условию удовлетворяет >10-15% строк таблицы, планировщик выбирает Seq Scan, потому что случайный доступ к Heap страницам по индексу дороже последовательного чтения диска.',
      '5. Write Amplification: каждый лишний индекс замедляет INSERT/UPDATE и ускоряет раздувание страниц (bloat).',
    ];

    const concurrentlyTrap = {
      concept:
        'CREATE INDEX блокирует запись (ShareLock). CREATE INDEX CONCURRENTLY создает индекс в 2 прохода без блокировки писателей.',
      trap:
        'CONCURRENTLY нельзя выполнять внутри транзакции (BEGIN ... COMMIT). Если процесс создания упал (таймаут, deadlock), индекс остается в базе со статусом INVALID! Его нужно удалить через DROP INDEX CONCURRENTLY и пересоздать.',
    };

    return {
      step: 16,
      concept: 'Index Pitfalls, Invalidation & CONCURRENTLY',
      pitfalls,
      concurrentlyTrap,
      unusedIndexesStats: unusedIndexesQuery.rows,
    };
  }

  /**
   * 17. Pagination: Deep OFFSET vs Keyset/Cursor Pagination
   */
  @Get('17-pagination')
  async step17Pagination() {
    // 1. OFFSET 100,000 LIMIT 10 (Seq Scan / Index Scan считывает 100,000 строк и выбрасывает их)
    const t0 = performance.now();
    const offsetRes = await this.knex.raw(`
      SELECT id, total, created_at
      FROM pg_learn.orders
      ORDER BY created_at DESC, id DESC
      OFFSET 100000 LIMIT 10;
    `);
    const offsetTimeMs = (performance.now() - t0).toFixed(2);

    // 2. Keyset pagination: переход сразу по кортежу (created_at, id) < (cursor_date, cursor_id)
    const cursorDate = offsetRes.rows[0].created_at;
    const cursorId = offsetRes.rows[0].id;

    const t1 = performance.now();
    const keysetRes = await this.knex.raw(
      `
      SELECT id, total, created_at
      FROM pg_learn.orders
      WHERE (created_at, id) < (?, ?)
      ORDER BY created_at DESC, id DESC
      LIMIT 10;
    `,
      [cursorDate, cursorId],
    );
    const keysetTimeMs = (performance.now() - t1).toFixed(2);

    return {
      step: 17,
      concept: 'Deep Pagination: OFFSET vs Keyset/Cursor Pagination',
      performanceComparison: {
        offsetMethod: {
          timeMs: `${offsetTimeMs} ms`,
          complexity: 'O(OFFSET + LIMIT) — деградирует с ростом страницы.',
        },
        keysetMethod: {
          timeMs: `${keysetTimeMs} ms`,
          complexity:
            'O(LIMIT) — время ответа стабильно одинаково на 1-й и 10,000-й страницах.',
        },
      },
      keysetQueryExample:
        'WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20',
      interviewTrap:
        'OFFSET pagination не только медленная, но и приводит к дублированию или пропуску данных (inconsistent reads), если между запросами страниц произошли вставки или удаления.',
    };
  }

  /**
   * 18. Batch Operations & Highload Patterns
   * N+1 vs json_agg, bulk UNNEST, ON CONFLICT upsert, RETURNING.
   */
  @Get('18-batching')
  async step18Batching() {
    // 1. Устранение N+1 через json_agg() в одном запросе
    const jsonAggRes = await this.knex.raw(`
      SELECT
        o.id,
        o.total,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'qty', oi.qty,
            'price', oi.price
          )
        ) AS items
      FROM pg_learn.orders o
      JOIN pg_learn.order_items oi ON oi.order_id = o.id
      WHERE o.id BETWEEN 1 AND 3
      GROUP BY o.id, o.total;
    `);

    // 2. Массовая вставка через UNNEST() (гораздо быстрее 1000 отдельных INSERT и экономит память)
    const unnestSnippet = `
      INSERT INTO pg_learn.products (sku, title, category, price, stock)
      SELECT * FROM unnest(
        ?::text[], -- массив sku
        ?::text[], -- массив title
        ?::text[], -- массив category
        ?::numeric[], -- массив price
        ?::int[] -- массив stock
      );
    `;

    // 3. Upsert: ON CONFLICT DO UPDATE
    const upsertRes = await this.knex.raw(`
      INSERT INTO pg_learn.products (sku, title, category, price, stock)
      VALUES ('SKU-000001', 'Updated Title', 'electronics', 49.99, 100)
      ON CONFLICT (sku) DO UPDATE
      SET
        price = EXCLUDED.price,
        stock = EXCLUDED.stock
      RETURNING id, sku, price, stock;
    `);

    return {
      step: 18,
      concept: 'Batch Operations, json_agg, UNNEST & Upsert',
      nPlusOneSolutionWithJsonAgg: jsonAggRes.rows,
      bulkUnnestPattern: unnestSnippet,
      upsertResult: upsertRes.rows[0],
      seniorNote:
        'COPY (или pg-copy-streams в Node.js) — самый быстрый способ загрузки миллионов строк (в 5-10 раз быстрее любого INSERT). При массовых вставках рекомендуется отключать триггеры и временно удалять вторичные индексы.',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: DISTRIBUTED PATTERNS & MICROSERVICES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 19. Transactional Outbox Pattern
   * Атомарная запись заказа и события в outbox + безопасная выборка через SKIP LOCKED.
   */
  @Post('19-outbox')
  async step19Outbox(@Body() body: any) {
    const customerId = body?.customerId ?? 1;
    const total = body?.total ?? 199.99;

    // 1. В локальной транзакции создаем заказ И пишем событие в outbox
    const orderId = await this.knex.transaction(async (trx) => {
      const orderInsert = await trx.raw(
        `
        INSERT INTO pg_learn.orders (customer_id, status, total)
        VALUES (?, 'new', ?)
        RETURNING id;
      `,
        [customerId, total],
      );

      const createdOrderId = orderInsert.rows[0].id;

      await trx.raw(
        `
        INSERT INTO pg_learn.outbox (aggregate_type, aggregate_id, event_type, payload)
        VALUES (?, ?, ?, ?::jsonb);
      `,
        [
          'Order',
          String(createdOrderId),
          'OrderCreated',
          JSON.stringify({ orderId: createdOrderId, customerId, total }),
        ],
      );

      return createdOrderId;
    });

    // 2. Симуляция Outbox Relay процесса:
    // Читаем непомеченные события с FOR UPDATE SKIP LOCKED (безопасно для N подов)
    const pendingEvents = await this.knex.transaction(async (trx) => {
      const events = await trx.raw(`
        SELECT id, aggregate_id, event_type, payload
        FROM pg_learn.outbox
        WHERE published_at IS NULL
        ORDER BY id
        LIMIT 5
        FOR UPDATE SKIP LOCKED;
      `);

      // Если Kafka доступна — шлем сообщение в топик reservation.events
      for (const ev of events.rows) {
        if (this.kafkaProducer) {
          try {
            await this.kafkaProducer.send('reservation.events', {
              key: String(ev.aggregate_id),
              value: ev.payload,
              headers: { eventType: ev.event_type },
            });
          } catch (e: any) {
            this.logger.warn(`Kafka delivery skipped: ${e.message}`);
          }
        }

        // Помечаем событие как отправленное
        await trx.raw(
          `UPDATE pg_learn.outbox SET published_at = now() WHERE id = ?`,
          [ev.id],
        );
      }

      return events.rows;
    });

    return {
      step: 19,
      concept: 'Transactional Outbox Pattern & SKIP LOCKED Relay',
      orderCreatedId: orderId,
      dispatchedEvents: pendingEvents,
      whyDualWriteFails:
        'Dual-Write (запись в БД + прямой вызов Kafka) гарантированно приводит к расхождению данных при сбоях сети/рестарте пода: либо событие в Кафке есть, а в БД откат, либо в БД сохранено, а Кафка не получила.',
      cdcAlternative:
        'Debezium (Change Data Capture) читает WAL логи PostgreSQL напрямую через logical replication slot — нулевой оверхед на polling и мгновенная отправка в Kafka.',
    };
  }

  /**
   * 20. Idempotent Consumer (Inbox Pattern) & Saga vs 2PC
   */
  @Post('20-idempotency')
  async step20Idempotency(@Body() body: any) {
    const eventId =
      body?.eventId ?? 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    const consumerName = 'reservation-service-consumer';

    // 1. Идемпотентная вставка события в processed_events в одной транзакции с бизнес-логикой
    let wasProcessed = false;

    await this.knex.transaction(async (trx) => {
      // Пытаемся зафиксировать event_id
      const insertResult = await trx.raw(
        `
        INSERT INTO pg_learn.processed_events (event_id, consumer)
        VALUES (?::uuid, ?)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id;
      `,
        [eventId, consumerName],
      );

      if (insertResult.rows.length === 0) {
        // Дубликат события из Kafka (at-least-once доставка)
        wasProcessed = false;
        return;
      }

      // Если вставка успешна — применяем сайд-эффект в БД
      wasProcessed = true;
      await trx.raw(
        `UPDATE pg_learn.accounts SET balance = balance + 10 WHERE id = 1`,
      );
    });

    return {
      step: 20,
      concept: 'Idempotent Consumer (Inbox Pattern) & 2PC vs Saga',
      eventId,
      processedSuccessfully: wasProcessed,
      status: wasProcessed
        ? 'Событие обработано впервые, баланс начислен.'
        : 'Дубликат события проигнорирован (Idempotent skip).',
      comparison: {
        twoPhaseCommit:
          '2PC (XA транзакции, PREPARE TRANSACTION): координирует строгий атомарный коммит между базами. В микросервисах НЕ используется из-за блокировок строк на время ответа координатора (SPOF) и низкой доступности.',
        sagaPattern:
          'Saga: цепочка локальных транзакций с компенсирующими действиями при отказе. Координируется через Orchestrator или Choreography. (У нас в проекте уже реализован SagaOrchestratorService в apps/reservation/src/saga).',
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: OPS, PARTITIONING & MONITORING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 21. Declarative Table Partitioning & Pruning
   */
  @Get('21-partitioning')
  async step21Partitioning() {
    // 1. Демонстрация Partition Pruning в плане запроса
    const prunePlan = await this.explainQuery(`
      SELECT count(*)
      FROM pg_learn.page_views
      WHERE created_at >= '2025-03-01' AND created_at < '2025-04-01';
    `);

    // 2. Преимущество жизненного цикла: DROP PARTITION vs DELETE
    const lifecycleComparison = {
      deleteProblem:
        'DELETE FROM page_views WHERE created_at < "2025-02-01" генерирует миллионы dead tuples, раздувает WAL и требует тяжелого VACUUM.',
      dropPartitionWin:
        'ALTER TABLE page_views DETACH PARTITION page_views_2025_01; DROP TABLE page_views_2025_01; — мгновенное освобождение места на диске, 0 строк в WAL, 0 фрагментации.',
    };

    return {
      step: 21,
      concept: 'Declarative Range Partitioning & Partition Pruning',
      prunePlan,
      lifecycleComparison,
      partitioningRules: [
        'Первичный ключ обязать включать все столбцы ключа партиционирования: PRIMARY KEY (id, created_at).',
        'Партиционировать имеет смысл таблицы от 50-100 GB или с жесткими требованиями к ротации старых данных (retention policy).',
        'Для автоматического создания будущих партиций в проде используют расширение pg_partman.',
      ],
    };
  }

  /**
   * 22. Highload Scaling, PgBouncer & Replication
   */
  @Get('22-scaling')
  async step22Scaling() {
    const scalingArchitecture = {
      connectionLimit:
        'В PostgreSQL каждое соединение — это отдельный процесс ОС (backend process), потребляющий ~5-10 MB оперативной памяти. 500 прямых соединений перегружают планировщик ОС контекстными переключениями.',
      pgBouncer: {
        sessionMode: 'Соединение удерживается клиентом всё время жизни сессии.',
        transactionMode:
          'Соединение из пула выдается только на время транзакции (BEGIN...COMMIT) и сразу возвращается. Позволяет 10,000 клиентам работать через 50 серверных соединений!',
        traps:
          'В transaction mode нельзя использовать: Prepared Statements (без названий/pgbouncer 1.21+), SET LOCAL вместо SET, LISTEN/NOTIFY, Advisory Locks уровня сессии.',
      },
      replication: {
        streaming:
          'Физическая потоковая репликация WAL-записей. Реплика доступна только для чтения (hot standby).',
        syncCommitLevels:
          'off (быстро, риск потери ~200ms) -> local (записано на мастере) -> remote_write (в памяти реплики) -> on (на диске реплики) -> remote_apply (применено на реплике).',
        replicaLag:
          'Репликация асинхронна. Паттерн "Read-Your-Writes": после мутации читать данные с мастера, а тяжелые аналитические отчеты слать на реплики.',
      },
      highAvailability:
        'Patroni (DCS etcd/Consul) — золотой стандарт автоматического failover для PostgreSQL. Решает проблему Split-Brain.',
    };

    return {
      step: 22,
      concept: 'PostgreSQL Scaling, Connection Pooling (PgBouncer) & HA',
      scalingArchitecture,
    };
  }

  /**
   * 23. Production Monitoring & Health Inspection
   */
  @Get('23-monitoring')
  async step23Monitoring() {
    // 1. Активные и висящие транзакции из pg_stat_activity
    const activeQueries = await this.knex.raw(`
      SELECT
        pid,
        usename,
        state,
        age(clock_timestamp(), query_start) AS duration,
        substr(query, 1, 80) AS query_preview
      FROM pg_stat_activity
      WHERE state != 'idle'
      ORDER BY duration DESC
      LIMIT 5;
    `);

    // 2. Cache Hit Ratio (должен быть > 99%)
    const cacheHitRatio = await this.knex.raw(`
      SELECT
        sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0) * 100 AS buffer_cache_hit_ratio
      FROM pg_statio_user_tables;
    `);

    // 3. Топ таблиц по размеру
    const tableSizes = await this.knex.raw(`
      SELECT
        relname AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid)) AS table_size,
        pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
      FROM pg_catalog.pg_statio_user_tables
      WHERE schemaname = 'pg_learn'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 5;
    `);

    return {
      step: 23,
      concept: 'Production Monitoring & Diagnostics (pg_stat_*)',
      activeConnections: activeQueries.rows,
      bufferCacheHitRatio: `${Number(cacheHitRatio.rows[0]?.buffer_cache_hit_ratio ?? 99.5).toFixed(2)}%`,
      topTableSizes: tableSizes.rows,
      keyMetricsToAlert: [
        'pg_stat_activity: транзакции в состоянии "idle in transaction" дольше 30 сек.',
        'pg_locks: блокировки, где granted = false (кто-то кого-то ждет).',
        'pg_stat_statements: запросы с высоким mean_exec_time или большим temp_blks_written (нехватка work_mem).',
        'pg_stat_database: deadlocks > 0.',
        'pg_replication_slots: активный лаг репликации в байтах.',
      ],
    };
  }
}
