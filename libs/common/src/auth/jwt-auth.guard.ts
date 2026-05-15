import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const jwt = request.cookies?.Authentication;
    if (!jwt) {
      return false;
    }

    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    try {
      let payload: any;
      try {
        payload = this.jwtService.verify(jwt);
      } catch (err) {
        // Transparent Refresh logic
        const refreshToken = request.cookies?.Refresh;
        if (!refreshToken) {
          throw new UnauthorizedException();
        }

        const refreshPayload = this.jwtService.verify(refreshToken);
        const storedRefresh = await this.redisService.get(
          `refreshToken:${refreshPayload.userId}`,
        );

        if (refreshToken !== storedRefresh) {
          throw new UnauthorizedException();
        }

        const session = await this.redisService.get(
          `session:${refreshPayload.userId}`,
        );
        if (!session) {
          throw new UnauthorizedException();
        }

        const user = JSON.parse(session);
        const newAccessToken = this.jwtService.sign({ userId: user._id });

        response.cookie('Authentication', newAccessToken, {
          httpOnly: true,
          expires: new Date(
            Date.now() + this.configService.get('JWT_EXPIRATION') * 1000,
          ),
        });

        request.user = user;
        return true;
      }

      const session = await this.redisService.get(`session:${payload.userId}`);
      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const user = JSON.parse(session);

      if (roles && !roles.every((role) => user.roles?.includes(role))) {
        this.logger.error('The user does not have valid roles');
        throw new UnauthorizedException();
      }

      // Async TTL update (Sliding Session)
      this.redisService
        .expire(
          `session:${payload.userId}`,
          this.configService.get('JWT_EXPIRATION'),
        )
        .catch(() => {});
      this.redisService
        .expire(
          `refreshToken:${payload.userId}`,
          this.configService.get('JWT_REFRESH_EXPIRATION'),
        )
        .catch(() => {});

      request.user = user;
      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }
}
