import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RMQ_EXCHANGES, RMQ_ROUTING_KEYS } from '../rabbitmq/rmq.constants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const jwt = context.switchToHttp().getRequest().cookies?.Authentication;

    if (!jwt) {
      return false;
    }

    try {
      const res = await this.amqpConnection.request<any>({
        exchange: RMQ_EXCHANGES.DEFAULT,
        routingKey: RMQ_ROUTING_KEYS.AUTH.AUTHENTICATE,
        payload: { Authentication: jwt },
        timeout: 5000,
      });

      context.switchToHttp().getRequest().user = res;
      return true;
    } catch (err: any) {
      this.logger.error(
        'Authentication failed via RPC',
        err.stack || err.message,
      );
      return false;
    }
  }
}
