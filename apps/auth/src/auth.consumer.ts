import { Injectable, UseGuards, Logger, OnModuleInit } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  RabbitRPC,
  RabbitSubscribe,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
  KafkaConsumerService,
  KAFKA_TOPICS,
  DELIVERY_MODES,
  UserRegisteredEvent,
  UserLoginEvent,
  MessageMeta,
} from '@app/common';

@Injectable()
export class AuthConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuthConsumer.name);

  constructor(
    private readonly authService: AuthService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * KAFKA ПОДПИСКИ (ШАГИ 1, 2, 4, 7 ИЗ KAFKA.md)
   * ═══════════════════════════════════════════════════════════════════════════
   * Здесь регистрируются обработчики входящих топиков Kafka.
   * При получении сообщения консьюмер вызывает соответствующий метод AuthService.
   */
  onModuleInit() {
    // [ШАГИ 1, 2, 4, 7] Слушаем регистрацию пользователей (топик: user.registered)
    this.kafkaConsumer.subscribe(
      KAFKA_TOPICS.USER_REGISTERED,
      (payload: UserRegisteredEvent, meta: MessageMeta) =>
        this.authService.registerUserFromKafka(payload, meta),
      { deliveryMode: DELIVERY_MODES.AT_LEAST_ONCE },
    );

    // Слушаем входы пользователей (топик: user.login)
    this.kafkaConsumer.subscribe(
      KAFKA_TOPICS.USER_LOGIN,
      (payload: UserLoginEvent, meta: MessageMeta) =>
        this.authService.processUserLoginFromKafka(payload, meta),
      { deliveryMode: DELIVERY_MODES.AT_MOST_ONCE },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RABBITMQ ПОДПИСКИ
  // ═══════════════════════════════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard)
  @RabbitRPC({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.AUTH.AUTHENTICATE,
    queue: RMQ_QUEUES.AUTH,
    queueOptions: { deadLetterExchange: RMQ_EXCHANGES.DLX },
  })
  async authenticate(data: any) {
    return data.user;
  }

  @RabbitRPC({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.RPC,
    queue: 'learning-rpc-queue',
  })
  async handleRpc(data: any) {
    this.logger.log(
      `📬 [LEARNING RPC] auth.consumer принял запрос: "${data.question}". Вычисляем ответ...`,
    );
    // Возвращаем результат. Библиотека сама отправит его обратно в reservations
    return {
      status: 'success',
      answer: 'Справочная служба auth: Авторизация работает стабильно!',
      processedAt: new Date(),
    };
  }

  @RabbitRPC({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.LEARNING.RPC_HANG,
    queue: 'learning-rpc-hang-queue',
  })
  async handleRpcHang() {
    this.logger.log(
      `📬 [LEARNING RPC HANG] auth.consumer принял запрос. Имитируем зависание на 10 секунд...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));
    this.logger.log(
      `📬 [LEARNING RPC HANG] auth.consumer проснулся и отправляет ответ в пустоту.`,
    );
    return { answer: 'Этот ответ никто не услышит из-за таймаута...' };
  }

  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DIRECT_TEST,
    routingKey: RMQ_ROUTING_KEYS.DIRECT_TEST,
    queue: RMQ_QUEUES.DIRECT_TEST,
  })
  async handleDirectTest(data: any) {
    this.logger.log(
      `📬[DIRECT EXCHANGE] Получено сообщение в auth.consumer: ${JSON.stringify(data)}`,
    );
  }
}
