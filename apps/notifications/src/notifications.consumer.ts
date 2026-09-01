import { Injectable, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotifyEmailDto } from '../dto/notify-email.dto';
import {
  RabbitSubscribe,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
} from '@app/common';

@Injectable()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async sendSlackAlert(payload: any) {
    // В продакшене здесь делается HTTP POST запрос в Slack Webhook:
    // await axios.post(process.env.SLACK_WEBHOOK_URL, { text: `🚨 *CRITICAL ALERT:* ${payload.message}` });
    this.logger.warn(
      `📢 [SLACK NOTIFIER] 🚨 Отправлено экстренное оповещение в канал #dev-alerts:\n` +
      `   *ТЕКСТ АЛЕРТА:* Подозрение на сбой платежей! Сообщение попало в DLQ после всех ретраев.\n` +
      `   *ДАННЫЕ ЗАКАЗА:* ${JSON.stringify(payload)}`
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
    this.logger.log(`📬 [LEARNING SUBSCRIBE] Обработка завершена, ответ продюсеру не отправляется (void).`);
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
      `   - Данные: ${JSON.stringify(data)}`
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
