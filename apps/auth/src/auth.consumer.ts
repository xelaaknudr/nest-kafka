import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  RabbitRPC,
  RabbitSubscribe,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
} from '@app/common';

@Injectable()
export class AuthConsumer {
  private readonly logger = new Logger(AuthConsumer.name);

  constructor(private readonly authService: AuthService) {}

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
  async handleRpcHang(data: any) {
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
      `📬 [DIRECT EXCHANGE] Получено сообщение в auth.consumer: ${JSON.stringify(data)}`,
    );
  }
}
