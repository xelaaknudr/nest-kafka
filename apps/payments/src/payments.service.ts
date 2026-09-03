import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RMQ_EXCHANGES, RMQ_ROUTING_KEYS } from '@app/common';
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
}
