import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ReservationRepository } from '../reservation.repository';
import { ReservationEntity } from '../models/reservation.entity';
import { SagaInstanceEntity, SagaStepLog } from './models/saga-instance.entity';
import { RMQ_EXCHANGES, RMQ_ROUTING_KEYS } from '@app/common';

export type { SagaStepLog };
export type SagaInstance = SagaInstanceEntity;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SAGA ORCHESTRATOR (EVENT-DRIVEN ДИРИЖЕР РАСПРЕДЕЛЕННОЙ ТРАНЗАКЦИИ)
 * ═══════════════════════════════════════════════════════════════════════════
 * В продакшене Сага НЕ использует блокирующий RPC (amqp.request).
 * Она работает по шаблону Command-Reply через асинхронные события:
 *
 * 1. startBookingSaga:
 *    - Создает бронь в статусе PENDING (локальная транзакция в схеме reservations).
 *    - Сохраняет инстанс Саги со статусом STARTED в PostgreSQL.
 *    - Публикует асинхронную КОМАНДУ на списание 'saga.command.payment.process'.
 *    - СРАЗУ возвращает клиенту HTTP 202 Accepted (поток освобождается!).
 *
 * 2. Реакция на события через SagaEventsConsumer:
 *    - 'saga.event.payment.success' -> Сага переходит в NOTIFY_PENDING, шлет команду на email.
 *    - 'saga.event.payment.failed'  -> Сага переходит в COMPENSATING:
 *         * Локальный откат: бронь в CANCELLED.
 *         * Шлет команду на email об отмене.
 *         * Сага в COMPENSATED_FAILED.
 *    - 'saga.event.notify.failed' (если платеж прошел, а email упал):
 *         * Сага переходит в COMPENSATING:
 *         * Локальный откат: бронь в CANCELLED.
 *         * Команда компенсации в платежи: 'saga.command.payment.refund'!
 *    - 'saga.event.payment.refunded' -> подтверждение возврата денег, Сага в COMPENSATED_FAILED.
 *    - 'saga.event.notify.success'   -> бронь в CONFIRMED, Сага в COMPLETED.
 */
@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    @InjectRepository(SagaInstanceEntity)
    private readonly sagaRepo: Repository<SagaInstanceEntity>,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * Асинхронный запуск процесса Саги (Non-blocking, Event-Driven)
   */
  async startBookingSaga(dto: {
    amount: number;
    email: string;
    simulateFailure?: boolean;
    simulateNotifyFailure?: boolean;
    userId?: number;
  }) {
    const sagaId = `SAGA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const userId = dto.userId || 1;
    const amount = dto.amount;
    const email = dto.email;
    const simulateFailure = Boolean(dto.simulateFailure);
    const simulateNotifyFailure = Boolean(dto.simulateNotifyFailure);

    this.logger.log(
      `\n======================================================================`,
    );
    this.logger.log(
      `🎭 [SAGA ORCHESTRATOR] СТАРТ АСИНХРОННОЙ САГИ "${sagaId}" для ${email} ($${amount})`,
    );
    if (simulateFailure) {
      this.logger.warn(
        `⚠️ [SAGA ORCHESTRATOR] simulateFailure: true -> Ожидается отказ платежа и откат брони!`,
      );
    }
    if (simulateNotifyFailure) {
      this.logger.warn(
        `⚠️ [SAGA ORCHESTRATOR] simulateNotifyFailure: true -> Ожидается сбой уведомлений и каскадный REFUND платежа!`,
      );
    }
    this.logger.log(
      `======================================================================`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // ШАГ 1: Локальная транзакция бронирования (status: PENDING)
    // ─────────────────────────────────────────────────────────────────────────
    const reservation = new ReservationEntity({
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 2),
      timestamp: new Date(),
      userId,
      invoiceId: `SAGA-INV-${Date.now()}`,
      status: 'PENDING',
    });

    const savedReservation =
      await this.reservationRepository.create(reservation);

    const initialStep: SagaStepLog = {
      step: '1. RESERVATION_HOLD',
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      details: {
        reservationId: savedReservation.id,
        status: 'PENDING',
        info: 'Номер забронирован на удержание (Hold). Ожидаем асинхронную оплату.',
      },
    };

    const sagaInstance = this.sagaRepo.create({
      sagaId,
      reservationId: savedReservation.id,
      status: 'STARTED',
      history: [initialStep],
    });
    await this.sagaRepo.save(sagaInstance);

    this.logger.log(
      `📍 [ШАГ 1: RESERVATION] Бронь #${savedReservation.id} создана (PENDING). Сага "${sagaId}" сохранена в PostgreSQL.`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // ШАГ 2: Публикация асинхронной команды на списание средств (Fire & Forget)
    // ─────────────────────────────────────────────────────────────────────────
    sagaInstance.status = 'PAYMENT_PENDING';
    await this.sagaRepo.save(sagaInstance);

    this.logger.log(
      `📤 [ШАГ 2: COMMAND] Отправляем асинхронную команду "saga.command.payment.process" в очередь...`,
    );

    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      RMQ_ROUTING_KEYS.SAGA.COMMAND_PAYMENT_PROCESS,
      {
        sagaId,
        reservationId: savedReservation.id,
        amount,
        email,
        simulateFailure,
        simulateNotifyFailure,
      },
    );

    // Мгновенный ответ клиенту — поток Node.js свободен, память чиста!
    return {
      success: true,
      status: 'ACCEPTED',
      sagaId,
      reservationId: savedReservation.id,
      currentStatus: 'PAYMENT_PENDING',
      message:
        'Асинхронная Сага успешно инициирована. Поток свободен (HTTP 202). Шаги координируются через шину событий RabbitMQ.',
      checkStatusUrl: `/reservation/test/saga/${sagaId}`,
    };
  }

  /**
   * Алиас для обратной совместимости вызова
   */
  async executeBookingSaga(dto: {
    amount: number;
    email: string;
    simulateFailure?: boolean;
    simulateNotifyFailure?: boolean;
    userId?: number;
  }) {
    return this.startBookingSaga(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИКИ СОБЫТИЙ СТЕЙТ-МАШИНЫ (ВЫЗЫВАЮТСЯ ИЗ SagaEventsConsumer)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Шаг 2A: Платеж успешно списан сервисом Payments
   */
  async handlePaymentSuccess(event: {
    sagaId: string;
    reservationId: number;
    paymentId: number;
    amount: number;
    email: string;
    simulateNotifyFailure?: boolean;
  }) {
    const saga = await this.sagaRepo.findOneBy({ sagaId: event.sagaId });
    if (!saga) return;

    this.logger.log(
      `✅ [SAGA EVENT] Платеж одобрен для Saga "${event.sagaId}" (Payment ID: ${event.paymentId})`,
    );

    saga.history = [
      ...saga.history,
      {
        step: '2. PAYMENT_APPROVED',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        details: { paymentId: event.paymentId, amount: event.amount },
      },
    ];
    saga.status = 'NOTIFY_PENDING';
    await this.sagaRepo.save(saga);

    // ШАГ 3: Отправляем команду на отправку Email в notifications
    this.logger.log(
      `📤 [SAGA ORCHESTRATOR] Отправка асинхронной команды "saga.command.notify.send"...`,
    );
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      RMQ_ROUTING_KEYS.SAGA.COMMAND_NOTIFY_SEND,
      {
        sagaId: event.sagaId,
        reservationId: event.reservationId,
        email: event.email,
        type: 'BOOKING_CONFIRMED',
        simulateNotifyFailure: event.simulateNotifyFailure,
      },
    );
  }

  /**
   * Шаг 2B: Платеж отклонен сервисом Payments -> ЗАПУСК КОМПЕНСАЦИИ
   */
  async handlePaymentFailed(event: {
    sagaId: string;
    reservationId: number;
    reason: string;
    email: string;
  }) {
    const saga = await this.sagaRepo.findOneBy({ sagaId: event.sagaId });
    if (!saga) return;

    this.logger.error(
      `❌ [SAGA EVENT] Платеж отклонен для Saga "${event.sagaId}": ${event.reason}`,
    );

    saga.history = [
      ...saga.history,
      {
        step: '2. PAYMENT_DECLINED',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        details: { reason: event.reason },
      },
    ];
    saga.status = 'COMPENSATING';
    saga.error = event.reason;
    await this.sagaRepo.save(saga);

    this.logger.warn(
      `\n↩️ [SAGA ORCHESTRATOR] 🚨 ЗАПУСК КОМПЕНСАЦИИ (ROLLBACK) ДЛЯ "${event.sagaId}"...`,
    );

    // КОМПЕНСАЦИЯ 1 (Локальная транзакция): Отменяем бронь в reservations
    await this.reservationRepository.findOneAndUpdate(
      { id: event.reservationId },
      { status: 'CANCELLED' },
    );
    this.logger.warn(
      `↩️ [КОМПЕНСАЦИЯ 1: RESERVATIONS] Бронь #${event.reservationId} переведена в статус "CANCELLED" (номер освобожден).`,
    );

    saga.history = [
      ...saga.history,
      {
        step: 'COMPENSATION_CANCEL_RESERVATION',
        status: 'COMPENSATED',
        timestamp: new Date().toISOString(),
        details: { reservationId: event.reservationId, status: 'CANCELLED' },
      },
    ];

    // КОМПЕНСАЦИЯ 2 (Удаленная команда): Шлем письмо клиенту об отмене
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      RMQ_ROUTING_KEYS.SAGA.COMMAND_NOTIFY_SEND,
      {
        sagaId: event.sagaId,
        reservationId: event.reservationId,
        email: event.email,
        type: 'BOOKING_CANCELLED',
        reason: event.reason,
      },
    );

    saga.status = 'COMPENSATED_FAILED';
    await this.sagaRepo.save(saga);
  }

  /**
   * Шаг 3A: Уведомление успешно доставлено
   */
  async handleNotifySuccess(event: {
    sagaId: string;
    reservationId: number;
    email: string;
    type: string;
  }) {
    const saga = await this.sagaRepo.findOneBy({ sagaId: event.sagaId });
    if (!saga) return;

    if (saga.status === 'NOTIFY_PENDING') {
      // Успешное завершение всей Саги!
      saga.history = [
        ...saga.history,
        {
          step: '3. NOTIFICATION_SENT',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          details: { email: event.email, type: event.type },
        },
      ];

      // Подтверждаем бронь в локальной БД
      await this.reservationRepository.findOneAndUpdate(
        { id: event.reservationId },
        { status: 'CONFIRMED' },
      );

      saga.status = 'COMPLETED';
      await this.sagaRepo.save(saga);

      this.logger.log(
        `🎉 [SAGA ORCHESTRATOR] САГА "${event.sagaId}" УСПЕШНО ЗАВЕРШЕНА! Бронь #${event.reservationId} подтверждена ("CONFIRMED").`,
      );
      this.logger.log(
        `======================================================================\n`,
      );
    } else if (saga.status === 'COMPENSATING' || saga.status === 'COMPENSATED_FAILED') {
      // Это было письмо об отмене (компенсация)
      saga.history = [
        ...saga.history,
        {
          step: 'COMPENSATION_NOTIFY_USER',
          status: 'COMPENSATED',
          timestamp: new Date().toISOString(),
          details: { email: event.email, type: event.type },
        },
      ];
      saga.status = 'COMPENSATED_FAILED';
      await this.sagaRepo.save(saga);
      this.logger.warn(
        `🛑 [SAGA ORCHESTRATOR] САГА "${event.sagaId}" ЗАВЕРШЕНА С ОТКАТОМ ("COMPENSATED_FAILED"). Клиент оповещен.`,
      );
      this.logger.log(
        `======================================================================\n`,
      );
    }
  }

  /**
   * Шаг 3B: Сбой отправки Email после успешного списания -> ПОЛНЫЙ КАСКАДНЫЙ ОТКАТ (REFUND ПЛАТЕЖА!)
   */
  async handleNotifyFailed(event: {
    sagaId: string;
    reservationId: number;
    email: string;
    reason: string;
  }) {
    const saga = await this.sagaRepo.findOneBy({ sagaId: event.sagaId });
    if (!saga) return;

    this.logger.error(
      `❌ [SAGA EVENT] Уведомление не отправлено для Saga "${event.sagaId}": ${event.reason}`,
    );

    saga.history = [
      ...saga.history,
      {
        step: '3. NOTIFICATION_FAILED',
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        details: { reason: event.reason },
      },
    ];
    saga.status = 'COMPENSATING';
    saga.error = event.reason;
    await this.sagaRepo.save(saga);

    this.logger.warn(
      `\n↩️ [SAGA ORCHESTRATOR] 🚨 КАСКАДНЫЙ ОТКАТ (ROLLBACK): Отменяем бронь и командуем REFUND платежа!`,
    );

    // 1. Отменяем бронь
    await this.reservationRepository.findOneAndUpdate(
      { id: event.reservationId },
      { status: 'CANCELLED' },
    );
    saga.history = [
      ...saga.history,
      {
        step: 'COMPENSATION_CANCEL_RESERVATION',
        status: 'COMPENSATED',
        timestamp: new Date().toISOString(),
        details: { reservationId: event.reservationId, status: 'CANCELLED' },
      },
    ];
    await this.sagaRepo.save(saga);

    // 2. Командуем REFUND сервису платежей (Реальная компенсация в БД payments!)
    this.logger.warn(
      `↩️ [SAGA ORCHESTRATOR] Отправляем команду "saga.command.payment.refund" в сервис Payments...`,
    );
    await this.amqpConnection.publish(
      RMQ_EXCHANGES.DEFAULT,
      RMQ_ROUTING_KEYS.SAGA.COMMAND_PAYMENT_REFUND,
      {
        sagaId: event.sagaId,
        reservationId: event.reservationId,
      },
    );
  }

  /**
   * Завершение компенсации возврата средств (Refund Event)
   */
  async handlePaymentRefunded(event: {
    sagaId: string;
    reservationId: number;
    paymentId?: number;
  }) {
    const saga = await this.sagaRepo.findOneBy({ sagaId: event.sagaId });
    if (!saga) return;

    this.logger.warn(
      `↩️ [SAGA EVENT] Платеж #${event.paymentId ?? 'N/A'} успешно возвращен (REFUNDED) в БД payments для Saga "${event.sagaId}"`,
    );

    saga.history = [
      ...saga.history,
      {
        step: 'COMPENSATION_PAYMENT_REFUNDED',
        status: 'COMPENSATED',
        timestamp: new Date().toISOString(),
        details: { paymentId: event.paymentId, status: 'REFUNDED' },
      },
    ];
    saga.status = 'COMPENSATED_FAILED';
    await this.sagaRepo.save(saga);

    this.logger.warn(
      `🛑 [SAGA ORCHESTRATOR] Каскадный откат для Saga "${event.sagaId}" полностью завершен! Все сервисы согласованы.`,
    );
    this.logger.log(
      `======================================================================\n`,
    );
  }

  /**
   * Получить полный аудит-лог состояния Саги из БД по ID
   */
  async getSaga(sagaId: string): Promise<SagaInstanceEntity | null> {
    return this.sagaRepo.findOneBy({ sagaId });
  }

  /**
   * Список всех запущенных Саг из базы данных PostgreSQL
   */
  async getAllSagas(): Promise<SagaInstanceEntity[]> {
    return this.sagaRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
