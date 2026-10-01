import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  MessageMeta,
  PaymentCreatedEvent,
} from '@app/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PaymentsCreateChargeDto } from '../dto/payments-create-charge.dto';
import { PaymentsRepository } from './payments.repository';
import { PaymentEntity } from './models/payment.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private readonly stripe = new Stripe(
    this.configService.get('STRIPE_SECRET_KEY'),
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly amqpConnection: AmqpConnection,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async createCharge(
    { amount, email }: PaymentsCreateChargeDto,
    idempotencyKey?: string,
    orderId?: string,
  ) {
    this.logger.log(`Processing payment of $${amount} for email: ${email}`);

    // Сохраняем в PostgreSQL с защитой по уникальному idempotencyKey
    try {
      await this.paymentsRepository.create(
        new PaymentEntity({
          orderId: orderId || 'ORDER-RPC-' + Date.now(),
          amount,
          email,
          idempotencyKey: idempotencyKey || null,
          status: 'COMPLETED',
        }),
      );
    } catch (err) {
      if (err?.code === '23505') {
        this.logger.warn(
          `[IDEMPOTENCY] Платеж по ключу "${idempotencyKey}" уже зафиксирован в БД. Повторное списание предотвращено.`,
        );
      }
    }

    this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      RMQ_ROUTING_KEYS.NOTIFICATIONS.NOTIFY_EMAIL,
      {
        email,
        text: `Your payment of $${amount} has completed successfully.`,
      },
    );

    this.logger.log(`Payment succeeded`);

    return {
      amount,
      email,
      id: 'mocked-id-123',
    };
  }

  /**
   * КЕЙС 1: Обработка платежа БЕЗ проверки идемпотентности (Демонстрация Бага)
   *
   * Каждый пришедший дубликат создает новую запись в PostgreSQL.
   * Итог: с клиента деньги списываются несколько раз (Double Charge).
   */
  async processPaymentWithoutIdempotency(data: {
    orderId: string;
    amount: number;
    email: string;
  }): Promise<PaymentEntity> {
    const payment = new PaymentEntity({
      orderId: data.orderId,
      amount: data.amount,
      email: data.email,
      status: 'COMPLETED',
      idempotencyKey: null, // Нет защиты
    });

    const saved = await this.paymentsRepository.create(payment);
    this.logger.warn(
      `💸 [DB WRITTEN] Заказ "${data.orderId}" сохранен в PostgreSQL (ID: ${saved.id}, Сумма: $${saved.amount}). Идемпотентность НЕ использовалась!`,
    );
    return saved;
  }

  /**
   * КЕЙС 2: Обработка платежа С ЗАЩИТОЙ ИДЕМПОТЕНТНОСТИ через PostgreSQL (Exactly-Once)
   *
   * 1. В таблице payments.payment_entity висит UNIQUE INDEX на колонку idempotencyKey.
   * 2. При попытке вставить дубликат база выбросит ошибку 23505 (unique_violation).
   * 3. Сервис перехватывает ошибку, понимает, что это дубликат, и НЕ производит списание средств!
   */
  async processPaymentWithIdempotency(data: {
    idempotencyKey: string;
    orderId: string;
    amount: number;
    email: string;
  }): Promise<{
    success: boolean;
    duplicate: boolean;
    payment?: PaymentEntity;
  }> {
    try {
      const payment = new PaymentEntity({
        idempotencyKey: data.idempotencyKey,
        orderId: data.orderId,
        amount: data.amount,
        email: data.email,
        status: 'COMPLETED',
      });

      const saved = await this.paymentsRepository.create(payment);
      this.logger.log(
        `🛡️ [IDEMPOTENCY DB SUCCESS] Платеж "${data.orderId}" успешно зафиксирован в PostgreSQL (ID: ${saved.id}, Ключ: ${data.idempotencyKey}).`,
      );
      return { success: true, duplicate: false, payment: saved };
    } catch (err) {
      // Код ошибки PostgreSQL '23505' = unique_violation (Нарушение уникального индекса)
      if (
        err?.code === '23505' ||
        err?.message?.includes('duplicate key') ||
        err?.detail?.includes('already exists')
      ) {
        this.logger.warn(
          `🛑 [POSTGRES IDEMPOTENCY GUARD] Перехвачена попытка дубля в базе! Ключ "${data.idempotencyKey}" уже существует. Повторное списание заблокировано!`,
        );
        return { success: true, duplicate: true };
      }
      throw err;
    }
  }

  async getPaymentsByOrderId(orderId: string) {
    return this.paymentsRepository.find({ orderId });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [ШАГИ 3, 5, 6, 8] Обработка платежа из Kafka
  // ─────────────────────────────────────────────────────────────────────────

  async processPaymentFromKafka(
    payload: PaymentCreatedEvent,
    meta: MessageMeta,
  ) {
    this.logger.log(
      `💳 [PAYMENTS] Получен платеж!\n` +
        `   UserId: ${payload.userId} | Amount: ${payload.amount} ${payload.currency ?? 'RUB'}\n` +
        `   🎓 Partition: ${meta.partition} | Offset: ${meta.offset}\n` +
        `   🎓 key="${payload.userId}" → MurmurHash2 → всегда Partition ${meta.partition} (FIFO!)`,
    );

    // СИМУЛЯЦИЯ ОШИБКИ (Шаг 8 - DLT)
    // Бизнес-логика просто выбрасывает ошибку при сбое.
    // Вся логика ретраев (backoff) и отправки в DLT теперь инкапсулирована в KafkaConsumerService!
    if (payload.simulateFailure) {
      this.logger.warn(
        `⚠️ [PAYMENTS] Симуляция сбоя платежа для пользователя ${payload.userId}!`,
      );
      throw new Error(
        `Симуляция сбоя платежа для пользователя ${payload.userId}`,
      );
    }

    // УСПЕШНАЯ БИЗНЕС-ЛОГИКА
    this.logger.log(
      `✅ [PAYMENTS] Платеж ${payload.paymentId ?? 'N/A'} успешно обработан!\n` +
        `   → Сейчас KafkaConsumerService закоммитит offset ${meta.offset} + 1`,
    );
  }

  async testFanOut(payload: any, meta: any) {
    this.logger.log(
      `📦 [PAYMENTS.FANOUT] Получено сообщение! Payload: ${JSON.stringify(payload)}`,
    );
    this.logger.log(
      `📦 [PAYMENTS.FANOUT] Metadata: Partition: ${meta.partition} | Offset: ${meta.offset}`,
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SAGA PATTERN: ОБРАБОТКА ПЛАТЕЖА (УСПЕХ ИЛИ ОТКАЗ)
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async processSagaPayment(data: {
    sagaId: string;
    reservationId: number;
    amount: number;
    email: string;
    simulateFailure?: boolean;
  }) {
    if (data.simulateFailure || data.amount > 1000) {
      const reason = data.simulateFailure
        ? 'Симуляция отказа банка (simulateFailure = true)'
        : `Превышен лимит списания: $${data.amount} > $1000 (Insufficient funds)`;

      this.logger.warn(
        `❌ [SAGA PAYMENTS] Платеж отклонен для Saga "${data.sagaId}"! Причина: ${reason}`,
      );

      return {
        success: false,
        sagaId: data.sagaId,
        reservationId: data.reservationId,
        reason,
      };
    }

    const payment = new PaymentEntity({
      idempotencyKey: `SAGA-PAY-${data.sagaId}`,
      orderId: `RES-${data.reservationId}`,
      amount: data.amount,
      email: data.email,
      status: 'COMPLETED',
    });

    const saved = await this.paymentsRepository.create(payment);

    this.logger.log(
      `✅ [SAGA PAYMENTS] Платеж на сумму $${data.amount} одобрен (ID: ${saved.id}) для Saga "${data.sagaId}"`,
    );

    return {
      success: true,
      sagaId: data.sagaId,
      reservationId: data.reservationId,
      paymentId: saved.id,
      amount: data.amount,
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SAGA PATTERN: КОМПЕНСИРУЮЩАЯ ТРАНЗАКЦИЯ — ВОЗВРАТ ПЛАТЕЖА (REFUND)
   * ═══════════════════════════════════════════════════════════════════════════
   * Вызывается, если платеж прошел успешно, но последующий шаг Саги
   * (например, сбой почтового сервиса) завершился ошибкой.
   * Переводит запись в локальной таблице payments.payment_entity в статус 'REFUNDED'.
   */
  async refundSagaPayment(data: { sagaId: string; reservationId: number }) {
    this.logger.warn(
      `↩️ [SAGA PAYMENTS] Получена команда на возврат средств (Refund) для Saga "${data.sagaId}"...`,
    );

    const idempotencyKey = `SAGA-PAY-${data.sagaId}`;
    try {
      const payment = await this.paymentsRepository.findOne({
        idempotencyKey,
      });

      if (payment) {
        payment.status = 'REFUNDED';
        await this.paymentsRepository.findOneAndUpdate(
          { idempotencyKey },
          { status: 'REFUNDED' },
        );
        this.logger.warn(
          `↩️ [SAGA PAYMENTS] Платеж #${payment.id} переведен в статус "REFUNDED" в БД payments (Rollback завершен)!`,
        );
        return {
          success: true,
          sagaId: data.sagaId,
          reservationId: data.reservationId,
          paymentId: payment.id,
        };
      } else {
        this.logger.warn(
          `⚠️ [SAGA PAYMENTS] Платеж для Saga "${data.sagaId}" не найден (возможно, списания не происходило).`,
        );
        return {
          success: true,
          sagaId: data.sagaId,
          reservationId: data.reservationId,
        };
      }
    } catch (err) {
      this.logger.error(
        `❌ [SAGA PAYMENTS] Ошибка при возврате платежа: ${err.message}`,
      );
      return {
        success: false,
        sagaId: data.sagaId,
        reservationId: data.reservationId,
        reason: err.message,
      };
    }
  }
}

