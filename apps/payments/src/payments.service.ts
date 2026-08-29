import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { NOTIFICATIONS_SERVICE } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentsCreateChargeDto } from '../dto/payments-create-charge.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private readonly stripe = new Stripe(
    this.configService.get('STRIPE_SECRET_KEY'),
  );

  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: ClientProxy,
  ) {}

  async createCharge({ token, amount, email }: PaymentsCreateChargeDto) {
    this.logger.log(`Processing payment of $${amount} for email: ${email}`);

    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: { token },
    });

    const paymentIntent = await this.stripe.paymentIntents.create({
      payment_method: paymentMethod.id,
      amount: amount * 100,
      confirm: true,
      payment_method_types: ['card'],
      currency: 'usd',
    });

    this.logger.log(
      `Payment succeeded: intentId=${paymentIntent.id}, status=${paymentIntent.status}`,
    );

    this.notificationsService.emit('notify_email', {
      email,
      text: `Your payment of $${amount} has completed successfully.`,
    });

    return paymentIntent;
  }
}
