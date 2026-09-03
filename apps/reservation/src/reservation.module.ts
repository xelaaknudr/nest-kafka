import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import {
  DatabaseModule,
  HealthModule,
  CommonRabbitMqModule,
  OutboxModule,
  LoggerModule,
} from '@app/common';
import { ReservationRepository } from './reservation.repository';
import { ReservationEntity } from './models/reservation.entity';
import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/reservation/.env',
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        RABBITMQ_URI: Joi.string().required(),
      }),
    }),
    HealthModule,
    DatabaseModule.forRoot({ schema: 'reservations' }),
    DatabaseModule.forFeature([ReservationEntity]),
    OutboxModule.forRoot({ schema: 'reservations' }),
    LoggerModule,
    CommonRabbitMqModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
