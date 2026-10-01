import {
  Injectable,
  Logger,
  OnModuleInit,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotifyEmailDto } from '../dto/notify-email.dto';
import {
  RabbitSubscribe,
  RabbitRPC,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
  KafkaConsumerService,
  KAFKA_TOPICS,
  ReservationEvent,
  MessageMeta,
} from '@app/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class NotificationsConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * KAFKA ПОДПИСКИ (ШАГИ 9, 10 ИЗ KAFKA.md)
   * ═══════════════════════════════════════════════════════════════════════════
   */
  onModuleInit() {
    // [ШАГИ 9, 10] Слушаем резервации пачками (eachBatch)
    this.kafkaConsumer.subscribeBatch(
      KAFKA_TOPICS.RESERVATION_EVENTS,
      (
        messages: Array<{ payload: ReservationEvent; meta: MessageMeta }>,
        topic: string,
        partition: number,
      ) =>
        this.notificationsService.handleReservationBatch(
          messages,
          topic,
          partition,
        ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RABBITMQ ПОДПИСКИ
  // ═══════════════════════════════════════════════════════════════════════════

  async sendSlackAlert(payload: any) {
    // В продакшене здесь делается HTTP POST запрос в Slack Webhook:
    // await axios.post(process.env.SLACK_WEBHOOK_URL, { text: `🚨 *CRITICAL ALERT:* ${payload.message}` });
    this.logger.warn(
      `📢 [SLACK NOTIFIER] 🚨 Отправлено экстренное оповещение в канал #dev-alerts:\n` +
        `   *ТЕКСТ АЛЕРТА:* Подозрение на сбой платежей! Сообщение попало в DLQ после всех ретраев.\n` +
        `   *ДАННЫЕ ЗАКАЗА:* ${JSON.stringify(payload)}`,
    );
  }

  /**
   * Бизнес-обработчик: Отправка Email-уведомления
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.NOTIFICATIONS.NOTIFY_EMAIL,
    queue: RMQ_QUEUES.NOTIFICATIONS,
    queueOptions: { deadLetterExchange: RMQ_EXCHANGES.DLX },
  })
  @UsePipes(new ValidationPipe())
  async notifyEmail(data: NotifyEmailDto) {
    this.logger.log(
      `[NotificationsConsumer] Received notify_email for: ${data.email}`,
    );
    await this.notificationsService.notifyEmail(data);
  }

  /**
   * Тест: Односторонний консьюмер (Fire and Forget)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.SUBSCRIBE,
    queue: 'learning-subscribe-queue',
  })
  async handleSubscribe(data: any) {
    this.logger.log(
      `📬 [LEARNING SUBSCRIBE] notifications.consumer принял открытку (Fire & Forget): ${JSON.stringify(data)}`,
    );
    this.logger.log(
      `📬 [LEARNING SUBSCRIBE] Обработка завершена, ответ продюсеру не отправляется (void).`,
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SAGA PATTERN: АСИНХРОННЫЙ ОБРАБОТЧИК КОМАНД УВЕДОМЛЕНИЙ (EVENT-DRIVEN)
   * ═══════════════════════════════════════════════════════════════════════════
   * Команда 'saga.command.notify.send'
   * Публикует:
   * - 'saga.event.notify.success' при успешной отправке
   * - 'saga.event.notify.failed' при сбое (симуляция или ошибка SMTP)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.SAGA.COMMAND_NOTIFY_SEND,
    queue: RMQ_QUEUES.SAGA_NOTIFICATIONS_COMMANDS,
  })
  async handleSagaNotificationCommand(data: {
    sagaId: string;
    reservationId: number;
    email: string;
    type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED';
    reason?: string;
    simulateNotifyFailure?: boolean;
  }) {
    this.logger.log(
      `✉️ [SAGA NOTIFICATIONS] Получена команда отправки Email (${data.type}) для Saga "${data.sagaId}", бронь #${data.reservationId}`,
    );

    const result = await this.notificationsService.sendSagaNotification(data);

    if (result.success) {
      await this.amqpConnection.publish(
        RMQ_EXCHANGES.DEFAULT,
        RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_SUCCESS,
        {
          sagaId: data.sagaId,
          reservationId: data.reservationId,
          email: data.email,
          type: data.type,
          deliveredAt: result.deliveredAt,
        },
      );
      this.logger.log(
        `📤 [SAGA NOTIFICATIONS] Опубликовано событие "saga.event.notify.success" для Saga "${data.sagaId}"`,
      );
    } else {
      await this.amqpConnection.publish(
        RMQ_EXCHANGES.DEFAULT,
        RMQ_ROUTING_KEYS.SAGA.EVENT_NOTIFY_FAILED,
        {
          sagaId: data.sagaId,
          reservationId: data.reservationId,
          email: data.email,
          type: data.type,
          reason: result.reason,
        },
      );
      this.logger.warn(
        `📤 [SAGA NOTIFICATIONS] Опубликовано событие "saga.event.notify.failed" для Saga "${data.sagaId}" (Причина: ${result.reason})`,
      );
    }
  }

  /**
   * Слушатель корзины брака (DLQ) со Slack-оповещением и вскрытием x-death

   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DLX,
    routingKey: '#', // Слушаем абсолютно все мертвые письма
    queue: RMQ_QUEUES.DLX,
  })
  async handleDlx(data: any, amqpMsg: any) {
    const xDeath = amqpMsg?.properties?.headers?.['x-death']?.[0];
    const reason = xDeath?.reason || 'unknown';
    const originalQueue = xDeath?.queue || 'unknown';
    const count = xDeath?.count || 1;

    await this.sendSlackAlert(data);
    this.logger.error(
      `💀 [DEAD LETTER QUEUE] Вскрытие мертвого письма!\n` +
        `   - Причина гибели (reason): "${reason}"\n` +
        `   - Исходная очередь (queue): "${originalQueue}"\n` +
        `   - Число попыток (count): ${count}\n` +
        `   - Данные: ${JSON.stringify(data)}`,
    );
  }

  /**
   * Тест: Fanout Exchange (Вещание)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.FANOUT_TEST,
    routingKey: '',
    queue: RMQ_QUEUES.FANOUT_TEST_NOTIF,
  })
  async handleFanoutTest(data: any) {
    this.logger.log(
      `📢 [FANOUT EXCHANGE] Получено сообщение в notifications.consumer: ${JSON.stringify(data)}`,
    );
  }

  /**
   * Тест: Topic Exchange (Маршрутизация по шаблонам EU)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.TOPIC_TEST,
    routingKey: RMQ_ROUTING_KEYS.TOPIC_TEST_EU,
    queue: RMQ_QUEUES.TOPIC_TEST_EU,
  })
  async handleTopicEuTest(data: any) {
    this.logger.log(
      `🌍 [TOPIC EXCHANGE - EUROPE] Получено сообщение с ключом ${data.region}.test.event: ${JSON.stringify(data)}`,
    );
  }

  /**
   * Тест: Topic Exchange (Маршрутизация по шаблонам US)
   */
  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.TOPIC_TEST,
    routingKey: RMQ_ROUTING_KEYS.TOPIC_TEST_US,
    queue: RMQ_QUEUES.TOPIC_TEST_US,
  })
  async handleTopicUsTest(data: any) {
    this.logger.log(
      `🌎 [TOPIC EXCHANGE - USA] Получено сообщение с ключом ${data.region}.test.event: ${JSON.stringify(data)}`,
    );
  }
}
