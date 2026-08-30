import { Injectable, UseGuards } from '@nestjs/common';
import { UserEntity } from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RabbitRPC,
  RMQ_EXCHANGES,
  RMQ_ROUTING_KEYS,
  RMQ_QUEUES,
} from '@app/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: UserEntity, response: Response) {
    const tokenPayload = {
      userId: user.id,
    };
    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get<number>('JWT_EXPIRATION'),
    );
    const token = this.jwtService.sign(tokenPayload);

    response.cookie('Authentication', token, {
      httpOnly: true,
      expires,
    });
    return token;
  }

  @UseGuards(JwtAuthGuard)
  @RabbitRPC({
    exchange: RMQ_EXCHANGES.DEFAULT,
    routingKey: RMQ_ROUTING_KEYS.AUTH.AUTHENTICATE,
    queue: RMQ_QUEUES.AUTH,
    queueOptions: { deadLetterExchange: RMQ_EXCHANGES.DLX },
  })
  async authenticate(data: any) {
    return data.user;
  }
}
