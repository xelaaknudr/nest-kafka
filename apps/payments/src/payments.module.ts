import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsConsumer } from './payments.consumer';
import { PaymentsRepository } from './payments.repository';
import { PaymentEntity } from './models/payment.entity';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import {
  LoggerModule,
  CommonRabbitMqModule,
  DatabaseModule,
} from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payments/.env',
      validationSchema: Joi.object({
        STRIPE_SECRET_KEY: Joi.string().required(),
        NOTIFICATIONS_HOST: Joi.string().required(),
        NOTIFICATIONS_PORT: Joi.number().required(),
        RABBITMQ_URI: Joi.string().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
      }),
    }),
    LoggerModule,
    CommonRabbitMqModule,
    DatabaseModule.forRoot({ schema: 'payments' }),
    DatabaseModule.forFeature([PaymentEntity]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsConsumer, PaymentsRepository],
  exports: [PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
