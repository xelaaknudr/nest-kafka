import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotifyEmailDto } from '../dto/notify-email.dto';
import { MessageMeta, ReservationEvent } from '@app/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: this.configService.get('SMTP_USER'),
      clientId: this.configService.get('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: this.configService.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      refreshToken: this.configService.get('GOOGLE_OAUTH_REFRESH_TOKEN'),
    },
  });

  async notifyEmail({ email, text }: NotifyEmailDto) {
    this.logger.log(`Sending email notification to: ${email}`);

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_USER'),
        to: email,
        subject: 'Sleepr Notification',
        text,
      });
      this.logger.log(`Email successfully sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [ШАГИ 9, 10] Пакетная обработка резерваций (eachBatch и Seek)
  // ─────────────────────────────────────────────────────────────────────────

  async handleReservationBatch(
    messages: Array<{ payload: ReservationEvent; meta: MessageMeta }>,
    topic: string,
    partition: number,
  ): Promise<void> {
    const firstOffset = messages[0]?.meta?.offset;
    const lastOffset = messages[messages.length - 1]?.meta?.offset;

    this.logger.log(
      `📦 [NOTIFICATIONS eachBatch] Пачка получена!\n` +
        `   Topic: ${topic} | Partition: ${partition} | Сообщений: ${messages.length}\n` +
        `   Диапазон offset: ${firstOffset} → ${lastOffset}\n` +
        `   🎓 Обрабатываем массив целиком и коммитим ОДИН раз на всю пачку`,
    );

    // Пример реальной Bulk-операции: собираем получателей для отправки одним запросом
    const recipients = messages.map(({ payload }) =>
      payload.guestName
        ? `${payload.guestName} (комната ${payload.roomNumber})`
        : (payload.userId ?? 'system'),
    );

    this.logger.log(
      `✉️ [NOTIFICATIONS] Массовая рассылка для ${recipients.length} пользователей завершена!`,
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * SAGA PATTERN: УВЕДОМЛЕНИЯ ПРИ УСПЕХЕ ИЛИ ОТКАТЕ
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async sendSagaNotification(data: {
    sagaId: string;
    reservationId: number;
    email: string;
    type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED';
    reason?: string;
    simulateNotifyFailure?: boolean;
  }) {
    if (data.simulateNotifyFailure) {
      const reason =
        'Почтовый шлюз SMTP/SendGrid временно недоступен (simulateNotifyFailure = true)';
      this.logger.error(
        `❌ [NOTIFICATIONS SAGA] Сбой отправки Email для Saga "${data.sagaId}": ${reason}`,
      );
      return {
        success: false,
        sagaId: data.sagaId,
        reservationId: data.reservationId,
        reason,
      };
    }

    if (data.type === 'BOOKING_CONFIRMED') {
      this.logger.log(
        `✉️ [NOTIFICATIONS SAGA] УСПЕХ: Отправлен Email клиенту ${data.email}: "Ваша бронь #${data.reservationId} успешно подтверждена!" (Saga: "${data.sagaId}")`,
      );
    } else {
      this.logger.warn(
        `✉️ [NOTIFICATIONS SAGA] КОМПЕНСАЦИЯ: Отправлен Email клиенту ${data.email}: "Бронь #${data.reservationId} отменена из-за сбоя оплаты (${data.reason})!" (Saga: "${data.sagaId}")`,
      );
    }

    return {
      success: true,
      sagaId: data.sagaId,
      reservationId: data.reservationId,
      deliveredAt: new Date().toISOString(),
      email: data.email,
      type: data.type,
    };
  }
}
