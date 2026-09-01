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

  // =========================================================================
  // РАЗДЕЛ 9: ГАРАНТИИ ДОСТАВКИ (DELIVERY GUARANTEES) — ТЕМА ДЛЯ СОБЕСЕДОВАНИЙ
  // =========================================================================

  /**
   * ТЕСТ 9.1: At-Most-Once (Максимум один раз / "Отправил и забыл")
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Что такое At-Most-Once и как его настроить в RabbitMQ?"
   *
   * ОТВЕТ:
   * 1. Это самый быстрый, но наименее надежный режим. Сообщения могут теряться, но никогда не продублируются.
   * 2. На стороне продюсера: отправляем с `deliveryMode: 1` (Transient). Сообщение живет ТОЛЬКО в RAM.
   * 3. На стороне брокера: очередь создается с `durable: false`.
   * 4. На стороне консьюмера: автоподтверждение (autoAck: true). Если воркер упадет в середине
   *    выполнения функции, сообщение навсегда сгорает.
   * 5. Где применять: Метрики, кликстрим, GPS-трекинг, логирование (потеря 0.01% не критична).
   */
  @Post('test/guarantees/at-most-once')
  async testAtMostOnce(@Body() body: { metricName: string; value: number }) {
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DIRECT_TEST,
      RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.AT_MOST_ONCE,
      {
        metricName: body.metricName || 'cpu_usage',
        value: body.value || 85,
        sentAt: new Date(),
      },
      {
        // 🎓 ВАЖНО ДЛЯ СОБЕСЕДОВАНИЯ:
        // deliveryMode: 1 = Сохранять только в RAM (Transient). Быстро, но сгорит при рестарте RabbitMQ.
        deliveryMode: 1,
      },
    );

    return {
      success: true,
      guarantee: '9.1 At-Most-Once',
      info: 'Метрика отправлена с deliveryMode: 1 (только в RAM). При сбое воркера она сгорит без дублей.',
    };
  }

  /**
   * ТЕСТ 9.2: At-Least-Once (Минимум один раз / Стандарт для e-commerce и банков)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Почему возникают дубликаты при At-Least-Once и как обеспечить сохранность на диске?"
   *
   * ОТВЕТ:
   * 1. ⚠️ КЛЮЧЕВАЯ ЛОВУШКА: Флаг `durable: true` на очереди сохраняет только САМ ПОЧТОВЫЙ ЯЩИК.
   *    Если отправить сообщение без `deliveryMode: 2`, при перезагрузке брокера ящик останется, но станет ПУСТЫМ!
   * 2. Для 100% гарантии живучести нужны ОБА условия:
   *    - Очередь `durable: true` (железный ящик)
   *    - Сообщение `deliveryMode: 2` (Persistent — запись байтов на SSD)
   * 3. Почему возникают ДУБЛИ?
   *    Воркер успешно выполнил работу (списал деньги), но в момент отправки ACK моргнула сеть.
   *    RabbitMQ не получил ACK, посчитал воркера умершим и переслал сообщение повторно.
   *    На повторе RabbitMQ выставляет системный заголовок `redelivered: true`.
   */
  @Post('test/guarantees/at-least-once')
  async testAtLeastOnce(@Body() body: { orderId: string; amount: number }) {
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DIRECT_TEST,
      RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.AT_LEAST_ONCE,
      {
        orderId: body.orderId || 'ORDER-AL-100',
        amount: body.amount || 250,
        sentAt: new Date(),
      },
      {
        // 🎓 ВАЖНО ДЛЯ СОБЕСЕДОВАНИЯ:
        // deliveryMode: 2 = Обязательно записать сообщение на диск (Persistent)!
        deliveryMode: 2,
      },
    );

    return {
      success: true,
      guarantee: '9.2 At-Least-Once',
      info: 'Заказ отправлен с deliveryMode: 2. Воркер сымитирует сбой на 1-й попытке и примет дубль с redelivered: true!',
    };
  }

  /**
   * ТЕСТ 9.3: Exactly-Once (Ровно один раз)
   *
   * 🎓 ВОПРОС НА СОБЕСЕДОВАНИИ: "Возможен ли чистый Exactly-Once в RabbitMQ на уровне протокола?"
   *
   * ОТВЕТ:
   * 1. НЕТ! По теореме двух генералов в ненадежной сети чистый Exactly-Once на уровне проводов невозможен.
   * 2. В продакшене Exactly-Once достигается связкой:
   *    [ Транспорт At-Least-Once ] + [ Идемпотентность на стороне Консьюмера ]
   * 3. Продюсер прикрепляет уникальный ключ `x-idempotency-key` (или ID заказа).
   * 4. Консьюмер перед списанием денег проверяет ключ в Redis/БД. Если ключ уже был — пропускает списание и делает ACK.
   */
  @Post('test/guarantees/exactly-once')
  async testExactlyOnce(
    @Body() body: { idempotencyKey: string; amount: number },
  ) {
    const key = body.idempotencyKey || 'IDEM-KEY-' + Date.now();
    const amount = body.amount || 500;

    // Имитируем отправку 3 дубликатов одного и того же платежа (например, при сетевых ретраях клиента)
    for (let i = 1; i <= 3; i++) {
      await this.amqpConnection.publish(
        RMQ_EXCHANGES.DIRECT_TEST,
        RMQ_ROUTING_KEYS.LEARNING.GUARANTEES.EXACTLY_ONCE,
        {
          idempotencyKey: key,
          amount,
          duplicateAttempt: i,
          sentAt: new Date(),
        },
        {
          deliveryMode: 2, // Persistent
          headers: {
            'x-idempotency-key': key, // Ключ идемпотентности для дедупликации
          },
        },
      );
    }

    return {
      success: true,
      guarantee: '9.3 Exactly-Once (via Idempotency)',
      idempotencyKey: key,
      info: 'Отправлено 3 дубликата сообщения с одинаковым idempotencyKey. Смотри логи payments: спишется только 1 раз!',
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
