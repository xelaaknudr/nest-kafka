import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RMQ_EXCHANGES, RMQ_ROUTING_KEYS } from '@app/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PaymentsCreateChargeDto } from '../dto/payments-create-charge.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private readonly stripe = new Stripe(
    this.configService.get('STRIPE_SECRET_KEY'),
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async createCharge({ amount, email }: PaymentsCreateChargeDto) {
    this.logger.log(`Processing payment of $${amount} for email: ${email}`);

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
}
