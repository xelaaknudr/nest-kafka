import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  CurrentUser,
  JwtAuthGuard,
  UserEntity,
  AmqpConnection,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
} from '@app/common';

@Controller('reservation')
export class ReservationController {
  constructor(
    private readonly reservationsService: ReservationService,
    private readonly amqpConnection: AmqpConnection, // Внедряем коннект к RabbitMQ
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.reservationsService.create(createReservationDto, user);
  }

  // --- ТЕСТОВЫЕ ЭНДПОИНТЫ ДЛЯ ИЗУЧЕНИЯ RABBITMQ ---

  /**
   * Тест 1: Direct Exchange (Прямой обход)
   * Сообщение уйдет строго в одну конкретную очередь, привязанную по ключу direct.test.key.
   */
  @Post('test/direct')
  async testDirect(@Body() body: { message: string }) {
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DIRECT_TEST,
      RMQ_ROUTING_KEYS.DIRECT_TEST,
      { text: body.message, sentAt: new Date() },
    );
    return { success: true, mode: 'direct', message: body.message };
  }

  /**
   * Тест 2: Fanout Exchange (Вещание)
   * Сообщение будет продублировано брокером во все очереди, привязанные к этому обменнику,
   * независимо от ключа маршрутизации.
   */
  @Post('test/fanout')
  async testFanout(@Body() body: { message: string }) {
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.FANOUT_TEST,
      '', // Routing key игнорируется при вещании, можно передать пустую строку
      { text: body.message, sentAt: new Date() },
    );
    return { success: true, mode: 'fanout', message: body.message };
  }

  /**
   * Тест 3: Topic Exchange (Маршрутизация по шаблонам)
   * Routing Key формируется динамически: '<region>.test.event'.
   * Очередь для EU слушает 'eu.#', а очередь для US слушает 'us.#'.
   */
  @Post('test/topic')
  async testTopic(@Body() body: { region: 'eu' | 'us'; message: string }) {
    const routingKey = `${body.region}.test.event`;
    await this.amqpConnection.publish(RMQ_EXCHANGES.TOPIC_TEST, routingKey, {
      text: body.message,
      region: body.region,
      sentAt: new Date(),
    });
    return { success: true, mode: 'topic', routingKey, message: body.message };
  }

  // ------------------------------------------------

  /**
   * Тест 4: Subscribe (Fire and Forget)
   * Отправляем сообщение в notifications и не ждем ответа.
   */
  @Post('test/learning-subscribe')
  async testLearningSubscribe(@Body() body: { message: string }) {
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DIRECT_TEST,
      RMQ_ROUTING_KEYS.LEARNING.SUBSCRIBE,
      { text: body.message, sentAt: new Date() },
    );
    return {
      success: true,
      info: 'Сообщение отправлено в notifications. Ответ не ожидается (Fire & Forget).',
    };
  }

  /**
   * Тест 5: RPC (Запрос-Ответ)
   * Отправляем запрос в auth и ждем ответа с результатом.
   */
  @Post('test/learning-rpc')
  async testLearningRpc(@Body() body: { question: string }) {
    try {
      const response = await this.amqpConnection.request<any>({
        exchange: RMQ_EXCHANGES.DIRECT_TEST,
        routingKey: RMQ_ROUTING_KEYS.LEARNING.RPC,
        payload: { question: body.question, sentAt: new Date() },
        timeout: 5000, // ждем ответ максимум 5 секунд
      });
      return {
        success: true,
        info: 'Получен ответ от RPC-консьюмера в auth!',
        response,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Тест 6: Зависший RPC (Таймаут)
   * Отправляем запрос в auth, но ставим лимит ожидания 3 секунды.
   * Консьюмер в auth будет спать 10 секунд. Мы получим ошибку таймаута.
   */
  @Post('test/learning-timeout')
  async testLearningTimeout(@Body() body: { question: string }) {
    try {
      const response = await this.amqpConnection.request<any>({
        exchange: RMQ_EXCHANGES.DIRECT_TEST,
        routingKey: RMQ_ROUTING_KEYS.LEARNING.RPC_HANG,
        payload: { question: body.question, sentAt: new Date() },
        timeout: 3000, // <--- ЖДЕМ ОТВЕТ НЕ БОЛЕЕ 3 СЕКУНД (3000 мс)
      });
      return { success: true, response };
    } catch (err) {
      return {
        success: false,
        info: 'Ошибка таймаута на стороне reservations! auth не успел ответить.',
        error: err.message,
      };
    }
  }

  /**
   * ТЕСТ 10: Полный цикл Ретрая (Retry Loop 3x -> DLQ -> Slack Alert)
   * Отправляет сообщение, которое будет автоматически повторяться 3 раза с паузой в 3 сек,
   * а затем уйдет в финальный DLQ и вызовет Slack-алерт.
   */
  @Post('test/retry-flow')
  async testRetryFlow(@Body() body: { orderId: string; amount: number }) {
    // Чистая отправка: контроллер не знает про очереди задержки и ретраи!
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DIRECT_TEST,
      RMQ_ROUTING_KEYS.LEARNING.RETRY_MAIN,
      {
        orderId: body.orderId || 'ORD-999',
        amount: body.amount || 300,
        sentAt: new Date(),
      },
    );

    return {
      success: true,
      info: 'Сообщение отправлено на обработку. Консьюмер сам управляет ретраями через RabbitRetryService.',
    };
  }

  /**
   * ТЕСТ: TRANSACTIONAL OUTBOX PATTERN (Сеньорский паттерн надежности)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Как гарантировать, что событие уйдет в RabbitMQ при успешном коммите в PostgreSQL?"
   *
   * 📌 КАК РАБОТАЕТ В ЭТОМ ЭНДПОИНТЕ:
   * 1. В рамках единой транзакции PostgreSQL сохраняются:
   *    - Запись бронирования в `reservations.reservation_entity`
   *    - Событие в `reservations.outbox` со статусом 'PENDING'
   * 2. Контроллер возвращает успешный ответ (HTTP 201) клиенту сразу же.
   * 3. Фоновый воркер `OutboxService` вычитывает PENDING-записи пачками (через SELECT ... FOR UPDATE SKIP LOCKED),
   *    публикует их в RabbitMQ и переводит в статус 'PROCESSED'.
   * 4. Сервис `payments` принимает событие и сохраняет платеж с idempotencyKey.
   */
  @Post('test/outbox')
  async testTransactionalOutbox(
    @Body() body: { amount?: number; email?: string },
  ) {
    const amount = body.amount || 750;
    const email = body.email || 'outbox-client@example.com';

    const reservation =
      await this.reservationsService.createReservationWithOutbox(
        {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 3),
          charge: { amount } as any,
        },
        { email, id: Math.floor(Math.random() * 1000) + 1 },
      );

    return {
      success: true,
      pattern: 'Transactional Outbox (Senior Pattern)',
      reservationId: reservation.id,
      amount,
      email,
      info: `Бронь #${reservation.id} и событие в outbox сохранены в ОДНОЙ транзакции. Фоновый Outbox Relay доставит его в payments через 2 секунды!`,
    };
  }

  /**
   * Тест 10: Кворумная очередь (Quorum Queue) с консенсусом Raft
   * Запись реплицируется между нодами. Защита от потери данных при сгорании сервера.
   */
  @Post('test/quorum')
  async testQuorumQueue(
    @Body() body: { orderId?: string; amount?: number },
  ) {
    const orderId = body.orderId || `ORDER-QUORUM-${Date.now()}`;
    const amount = body.amount || 990;

    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      'payments.quorum.key',
      { orderId, amount, sentAt: new Date() },
    );

    return {
      success: true,
      mode: 'Quorum Queue (Raft Consensus)',
      orderId,
      amount,
      info: 'Сообщение отправлено в кворумную очередь payments.quorum с защитой репликацией Raft!',
    };
  }

  /**
   * Тест 11: Шардирование очереди (Consistent Hash Sharding)
   * Продюсер шлет в ОБЩИЙ обменник 'sharded-orders-exchange' и передает userId.
   * RabbitMQ САМ вычисляет хэш и раскладывает по шардам: 'orders-shard-1' или 'orders-shard-2'!
   */
  @Post('test/sharding')
  async testSharding(
    @Body() body: { userId: number; amount?: number },
  ) {
    const userId = body.userId || Math.floor(Math.random() * 1000) + 1;
    const amount = body.amount || 450;
    const orderId = `ORDER-SHARD-${userId}-${Date.now()}`;

    // 🚀 Продюсер шлет в ОБЩИЙ обменник и передает userId как Routing Key:
    await this.amqpConnection.publish(
      'sharded-orders-exchange',
      String(userId), // 👈 Ключ шардирования! Брокер сам посчитает хэш!
      { orderId, userId, amount, sentAt: new Date() },
    );

    return {
      success: true,
      mode: 'Consistent Hash Sharding',
      userId,
      orderId,
      info: `Сообщение отправлено в обменник 'sharded-orders-exchange' с ключом '${userId}'. Брокер сам определил целевой шард!`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }
}
