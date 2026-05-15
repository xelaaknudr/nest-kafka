import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UserDocument } from './users/models/user.schema';
import { TokenPayload } from './interfaces/token-payload.interface';
import { RedisService } from '@app/common';
import { UsersService } from './users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {}

  async login(user: UserDocument, response: Response) {
    const tokenPayload: TokenPayload = {
      userId: user._id.toHexString(),
    };

    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(tokenPayload, {
      expiresIn: `${this.configService.get('JWT_REFRESH_EXPIRATION')}s`,
    });

    const accessTokenExpiration = this.configService.get('JWT_EXPIRATION');
    const refreshTokenExpiration = this.configService.get(
      'JWT_REFRESH_EXPIRATION',
    );

    const accessTokenExpires = new Date();
    accessTokenExpires.setSeconds(
      accessTokenExpires.getSeconds() + accessTokenExpiration,
    );

    const refreshTokenExpires = new Date();
    refreshTokenExpires.setSeconds(
      refreshTokenExpires.getSeconds() + refreshTokenExpiration,
    );

    // Save session for access token check
    await this.redisService.setWithExpiry(
      `session:${user._id.toHexString()}`,
      user,
      accessTokenExpiration,
    );

    // Save refresh token in Redis
    await this.redisService.setWithExpiry(
      `refreshToken:${user._id.toHexString()}`,
      refreshToken,
      refreshTokenExpiration,
    );

    response.cookie('Authentication', accessToken, {
      httpOnly: true,
      expires: accessTokenExpires,
    });

    response.cookie('Refresh', refreshToken, {
      httpOnly: true,
      expires: refreshTokenExpires,
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string, response: Response) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken);
      const storedToken = await this.redisService.get(
        `refreshToken:${payload.userId}`,
      );

      if (refreshToken !== storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.getUser({ _id: payload.userId });
      return this.login(user, response);
    } catch (err: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
