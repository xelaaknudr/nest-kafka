/**
 * 01_pg_learn_seed.ts — генерация реалистичного набора данных для Senior PG сценариев.
 *
 * Объём:
 * - 100k customers (клиенты 90001..100000 намеренно БЕЗ заказов — для anti-join)
 * - 5k products
 * - 500k orders (перекос статусов: 90% shipped, 5% new, 3% paid, 2% cancelled; monotonic created_at)
 * - 1.5M order_items
 * - 1k employees (иерархическое дерево: CEO -> Directors -> Managers -> Devs)
 * - accounts, doctors, room_bookings, outbox, processed_events
 * - 1M page_views (партиционированная таблица)
 *
 * Генерация через сырой SQL generate_series() внутри БД занимает ~3-5 секунд.
 * Завершается VACUUM ANALYZE для актуализации статистики планировщика.
 */
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Очищаем таблицы перед посевом
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    TRUNCATE TABLE
      order_items,
      orders,
      products,
      customers,
      employees,
      accounts,
      doctors,
      room_bookings,
      outbox,
      processed_events,
      page_views
    RESTART IDENTITY CASCADE;
  `);

  // 1. Customers (100,000 строк)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO customers (id, email, full_name, country, is_vip, created_at)
    SELECT
      i,
      'user_' || i || '@example.com',
      'Customer ' || i,
      (ARRAY['US', 'DE', 'FR', 'GB', 'CA', 'AU', 'NL', 'PL', 'ES', 'IT'])[1 + (i % 10)],
      (i % 20 = 0), -- 5% VIP
      '2024-01-01 00:00:00Z'::timestamptz + (i * interval '300 seconds')
    FROM generate_series(1, 100000) AS s(i);

    SELECT setval(pg_get_serial_sequence('customers', 'id'), 100000);
  `);

  // 2. Products (5,000 строк)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO products (id, sku, title, category, price, stock, attrs, tags)
    SELECT
      i,
      'SKU-' || lpad(i::text, 6, '0'),
      'Product Title ' || i,
      (ARRAY['electronics', 'books', 'clothing', 'home', 'sports'])[1 + (i % 5)],
      round(((10 + (i % 500) * 1.5)::numeric), 2),
      (i % 100) * 5,
      jsonb_build_object(
        'color', (ARRAY['black', 'white', 'blue', 'red'])[1 + (i % 4)],
        'weight_g', 100 + (i % 900),
        'specs', jsonb_build_object('warranty_months', 12 + (i % 24))
      ),
      ARRAY['tag_' || (i % 20), 'sale_' || (i % 5)]
    FROM generate_series(1, 5000) AS s(i);

    SELECT setval(pg_get_serial_sequence('products', 'id'), 5000);
  `);

  // 3. Orders (500,000 строк) — только для customers 1..90000!
  // Статусы перекошены: 90% shipped, 5% new, 3% paid, 2% cancelled
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO orders (id, customer_id, status, total, created_at)
    SELECT
      i,
      1 + (i % 90000), -- клиенты 90001..100000 остаются без заказов!
      CASE
        WHEN (i % 100) < 90 THEN 'shipped'::order_status
        WHEN (i % 100) < 95 THEN 'new'::order_status
        WHEN (i % 100) < 98 THEN 'paid'::order_status
        ELSE 'cancelled'::order_status
      END,
      round(((20 + (i % 300) * 2.25)::numeric), 2),
      '2025-01-01 00:00:00Z'::timestamptz + (i * interval '30 seconds')
    FROM generate_series(1, 500000) AS s(i);

    SELECT setval(pg_get_serial_sequence('orders', 'id'), 500000);
  `);

  // 4. Order items (1,500,000 строк) — по 3 товара на заказ
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO order_items (order_id, product_id, qty, price)
    SELECT
      o_id,
      1 + ((o_id * 3 + item_idx) % 5000),
      1 + (item_idx % 3),
      round(((15 + (o_id % 150))::numeric), 2)
    FROM generate_series(1, 500000) AS o(o_id)
    CROSS JOIN generate_series(1, 3) AS it(item_idx);
  `);

  // 5. Employees (1,000 строк — иерархическое дерево для recursive CTE)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO employees (id, full_name, department, salary, manager_id)
    VALUES
      (1, 'Alice Boss (CEO)', 'Executive', 250000, NULL),
      (2, 'Bob Tech (CTO)', 'Engineering', 180000, 1),
      (3, 'Charlie Sales (CRO)', 'Sales', 170000, 1),
      (4, 'Diana Finance (CFO)', 'Finance', 175000, 1);

    -- Directors / Lead Managers (5..20)
    INSERT INTO employees (id, full_name, department, salary, manager_id)
    SELECT
      i,
      'Lead ' || i,
      (ARRAY['Engineering', 'Sales', 'Finance', 'Product'])[1 + (i % 4)],
      120000 + (i * 1000),
      2 + (i % 3)
    FROM generate_series(5, 20) AS s(i);

    -- Senior Devs / Managers (21..100)
    INSERT INTO employees (id, full_name, department, salary, manager_id)
    SELECT
      i,
      'Manager ' || i,
      (ARRAY['Engineering', 'Sales', 'Finance', 'Product'])[1 + (i % 4)],
      90000 + (i * 300),
      5 + (i % 16)
    FROM generate_series(21, 100) AS s(i);

    -- Staff (101..1000)
    INSERT INTO employees (id, full_name, department, salary, manager_id)
    SELECT
      i,
      'Employee ' || i,
      (ARRAY['Engineering', 'Sales', 'Finance', 'Product'])[1 + (i % 4)],
      60000 + (i * 50),
      21 + (i % 80)
    FROM generate_series(101, 1000) AS s(i);
  `);

  // 6. Accounts (ACID / isolation / deadlock)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO accounts (id, owner, balance)
    VALUES
      (1, 'Alice', 1000.00),
      (2, 'Bob', 500.00),
      (3, 'Charlie', 200.00);
  `);

  // 7. Doctors (Write skew demo for SERIALIZABLE)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO doctors (id, name, on_call)
    VALUES
      (1, 'Dr. House', true),
      (2, 'Dr. Watson', true),
      (3, 'Dr. Strange', false);
  `);

  // 8. Room Bookings (EXCLUDE constraint btree_gist)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO room_bookings (room_id, guest, during)
    VALUES
      (101, 'Guest A', tstzrange('2025-06-01 14:00Z', '2025-06-05 12:00Z', '[)')),
      (101, 'Guest B', tstzrange('2025-06-06 14:00Z', '2025-06-10 12:00Z', '[)')),
      (102, 'Guest C', tstzrange('2025-06-01 14:00Z', '2025-06-07 12:00Z', '[)'));
  `);

  // 9. Outbox & Processed events
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload, published_at)
    VALUES
      ('Order', '101', 'OrderCreated', '{"total": 99.99, "customer_id": 1}'::jsonb, now() - interval '1 hour'),
      ('Order', '102', 'OrderCreated', '{"total": 149.50, "customer_id": 2}'::jsonb, NULL),
      ('Order', '103', 'OrderCreated', '{"total": 45.00, "customer_id": 3}'::jsonb, NULL);

    INSERT INTO processed_events (event_id, consumer, processed_at)
    VALUES
      ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, 'reservation-consumer', now() - interval '2 hour');
  `);

  // 10. Page views (1,000,000 строк по месяцам 2025-01..2025-06)
  await knex.raw(`
    SET LOCAL search_path TO pg_learn, public;

    INSERT INTO page_views (user_id, url, created_at)
    SELECT
      1 + (i % 50000),
      (ARRAY['/home', '/products', '/cart', '/checkout', '/profile', '/about'])[1 + (i % 6)],
      '2025-01-01 00:00:00Z'::timestamptz + ((i % 180) * interval '1 day') + ((i % 86400) * interval '1 second')
    FROM generate_series(1, 1000000) AS s(i);
  `);

  // 11. Обновление статистики для планировщика запросов
  await knex.raw(`
    VACUUM ANALYZE pg_learn.customers;
    VACUUM ANALYZE pg_learn.products;
    VACUUM ANALYZE pg_learn.orders;
    VACUUM ANALYZE pg_learn.order_items;
    VACUUM ANALYZE pg_learn.employees;
    VACUUM ANALYZE pg_learn.accounts;
    VACUUM ANALYZE pg_learn.doctors;
    VACUUM ANALYZE pg_learn.room_bookings;
    VACUUM ANALYZE pg_learn.outbox;
    VACUUM ANALYZE pg_learn.processed_events;
    VACUUM ANALYZE pg_learn.page_views;
  `);
}
