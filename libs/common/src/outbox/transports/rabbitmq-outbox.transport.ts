import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { IOutboxTransport } from '../outbox.types';
import { OutboxEntity } from '../outbox.entity';

/**
 * 🎓 СЛОЙ 3: ИНФРАСТРУКТУРНЫЙ АДАПТЕР (RABBITMQ TRANSPORT ADAPTER)
 *
 * ❓ ЗАЧЕМ ЭТОТ КЛАСС:
 * Реализует порт `IOutboxTransport`. Его единственная ответственность — взять строку
 * из базы данных (`OutboxEntity`) и правильно доставить ее в брокер RabbitMQ.
 *
 * 📌 ЧТО ОН ДЕЛАЕТ:
 * 1. `event.topic` мапит на Exchange в RabbitMQ (например, 'default-exchange').
 * 2. `event.key` мапит на RoutingKey (например, 'create_charge').
 * 3. `deliveryMode: 2` ➔ гарантирует сохранение байтов сообщения на диск SSD брокера!
 * 4. Заголовки `x-idempotency-key` и `x-outbox-id` ➔ сквозные метаданные для дедупликации в payments.
 */
@Injectable()
export class RabbitMqOutboxTransport implements IOutboxTransport {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish(event: OutboxEntity): Promise<void> {
    // Извлекаем или генерируем уникальный ключ для дедупликации на стороне консьюмера
    const idempotencyKey =
      event.payload?.idempotencyKey || `outbox-${event.id}`;

    await this.amqpConnection.publish(
      event.topic, // Exchange
      event.key, // Routing Key
      event.payload, // Тело сообщения (JSON)
      {
        deliveryMode: 2, // 🛡️ Persistent (на диск SSD)
        headers: {
          'x-idempotency-key': idempotencyKey, // Сквозной ключ идемпотентности
          'x-outbox-id': event.id, // ID записи в таблице outbox
        },
      },
    );
  }
}
