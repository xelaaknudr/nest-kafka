import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from './users/users.module';
import {
  HealthModule,
  LoggerModule,
  CommonRabbitMqModule,
  KafkaModule,
  KAFKA_GROUPS,
} from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthConsumer } from './auth.consumer';
import * as Joi from 'joi';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    UsersModule,
    LoggerModule,
    HealthModule,
    CommonRabbitMqModule,
    PassportModule.register({ defa: 'jwt' }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/auth/.env',
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().required(),
        HTTP_PORT: Joi.number().required(),
        RABBITMQ_URI: Joi.string().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        KAFKA_BROKERS: Joi.string().default('kafka:9092'),
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(configService.get<string>('JWT_EXPIRATION'), 10),
        },
      }),
    }),
    /**
     * 🎓 AUTH = КОНСЬЮМЕР
     * Паттерн: Round-Robin (user.registered без key) + Idempotency Guard.
     */
    KafkaModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        clientId: 'auth-service',
        brokers: configService.get<string>('KAFKA_BROKERS')
          ? configService.get<string>('KAFKA_BROKERS').split(',')
          : ['localhost:9092'],
        groupId: KAFKA_GROUPS.AUTH,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthConsumer, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
