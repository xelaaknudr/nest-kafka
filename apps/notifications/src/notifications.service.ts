import { Injectable, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  RabbitSubscribe,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
} from '@app/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotifyEmailDto } from '../dto/notify-email.dto';

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

  @RabbitSubscribe({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.NOTIFICATIONS.NOTIFY_EMAIL,
    queue: RMQ_QUEUES.NOTIFICATIONS,
    queueOptions: { deadLetterExchange: RMQ_EXCHANGES.DLX },
  })
  @UsePipes(new ValidationPipe())
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
}
