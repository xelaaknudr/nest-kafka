import { Injectable, Logger } from '@nestjs/common';
import {
  UserEntity,
  MessageMeta,
  UserRegisteredEvent,
  UserLoginEvent,
} from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly processedMessages = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: UserEntity, response: Response) {
    const tokenPayload = { userId: user.id };
    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get<number>('JWT_EXPIRATION'),
    );
    const token = this.jwtService.sign(tokenPayload);

    response.cookie('Authentication', token, { httpOnly: true, expires });
    return token;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [ШАГИ 1, 2, 4, 7] Обработка события регистрации пользователя
  // ─────────────────────────────────────────────────────────────────────────

  async registerUserFromKafka(payload: UserRegisteredEvent, meta: MessageMeta) {
    // ── [ШАГ 7: ИДЕМПОТЕНТНОСТЬ] ──
    // На Шаге 7 он покажет, как отсекать дубли сообщений.
    const idempotencyKey = `${meta.topic}:${meta.partition}:${meta.offset}`;

    if (this.processedMessages.has(idempotencyKey)) {
      this.logger.warn(`⚠️ [AuthService] ДУБЛЬ! Пропускаем: ${idempotencyKey}`);
      return; // Kafka Consumer закоммитит offset и пойдет дальше
    }
    this.processedMessages.add(idempotencyKey);

    // ── 2. БИЗНЕС-ЛОГИКА ──
    const info = (payload as any).message
      ? `Текст: "${(payload as any).message}"`
      : `Email: ${payload.email} | Name: ${payload.name}`;

    this.logger.log(
      `👤 [AuthService] Получено сообщение!\n` +
        `   ${info}\n` +
        `   Partition: ${meta.partition} | Offset: ${meta.offset}\n` +
        `   🎓 Round-Robin: Kafka выбрала Partition ${meta.partition} автоматически (key=null)`,
    );
  }

  async processUserLoginFromKafka(payload: UserLoginEvent, meta: MessageMeta) {
    const idempotencyKey = `${meta.topic}:${meta.partition}:${meta.offset}`;
    if (this.processedMessages.has(idempotencyKey)) {
      this.logger.warn(
        `⚠️ [AuthService] ДУБЛЬ LOGIN! Пропускаем: ${idempotencyKey}`,
      );
      return;
    }
    this.processedMessages.add(idempotencyKey);

    this.logger.log(
      `🔑 [AuthService] Пользователь вошел!\n` +
        `   Email: ${payload.email}\n` +
        `   Partition: ${meta.partition} | Offset: ${meta.offset}\n` +
        `   🎓 At-Most-Once: Offset ${meta.offset} закоммичен ДО выполнения бизнес-логики!`,
    );
  }
}
