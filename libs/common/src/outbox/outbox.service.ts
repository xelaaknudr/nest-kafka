import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxEntity } from './outbox.entity';
import {
  IOutboxTransport,
  OUTBOX_OPTIONS,
  OUTBOX_TRANSPORT,
  OutboxModuleOptions,
  OutboxStatus,
} from './outbox.types';

export { OUTBOX_OPTIONS, OUTBOX_TRANSPORT };

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private pollerTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(OUTBOX_TRANSPORT)
    private readonly transport: IOutboxTransport,
    @Optional()
    @Inject(OUTBOX_OPTIONS)
    private readonly options?: OutboxModuleOptions,
  ) {
    this.intervalMs = this.options?.pollingIntervalMs ?? 2000;
    this.batchSize = this.options?.batchSize ?? 20;
    this.maxRetries = this.options?.maxRetries ?? 5;
  }

  onModuleInit() {
    this.logger.log(
      `🚀 [OutboxService] Релей запущен (интервал: ${this.intervalMs}мс)`,
    );
    this.pollerTimer = setInterval(() => {
      this.pollAndRelay().catch((err) => {
        this.logger.error(`[OutboxService] Ошибка в цикле: ${err.message}`);
      });
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.logger.log('🛑 [OutboxService] Релей остановлен');
    }
  }

  /**
   * 🎓 ПУБЛИЧНЫЙ API: Создает сущность и Outbox-событие в одной транзакции PostgreSQL
   *
   * @param entity - Простой объект сущности (например, new ReservationEntity(...))
   * @param event - Простой объект события { topic, key, aggregateType, payload }
   */
  async create<TEntity extends { id?: any }>(
    entity: TEntity,
    event: {
      topic: string;
      key: string;
      aggregateType: string;
      payload: Record<string, any>;
    },
  ): Promise<TEntity> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Сохраняем сущность в PostgreSQL (например, запись бронирования)
      const savedEntity = await manager.save(entity);
      const entityId = String(savedEntity.id);

      // 2. В ту же самую SQL-транзакцию создаем запись Outbox со статусом 'PENDING'
      const outbox = manager.create(OutboxEntity, {
        topic: event.topic,
        key: event.key,
        aggregateType: event.aggregateType,
        aggregateId: entityId,
        payload: {
          ...event.payload,
          orderId: `ORDER-${event.aggregateType}-${entityId}`,
          idempotencyKey: `outbox-${event.aggregateType.toLowerCase()}-${entityId}`,
          entityId: savedEntity.id,
        },
        status: OutboxStatus.PENDING,
      });

      await manager.save(outbox);
      return savedEntity;
    });
  }

  /**
   * 🎓 ГЛАВНЫЙ СЦЕНАРИЙ РЕЛЕЯ: Простой линейный вызов из 2 шагов
   */
  async pollAndRelay(): Promise<void> {
    // Если предыдущий цикл еще шлет события — не запускаем параллельный в этом же процессе
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // ШАГ 1: Забираем из базы 20 событий со статусом PENDING
      const events = await this.fetchAndLockPendingEvents();

      // ШАГ 2: По очереди отправляем каждое событие в брокер
      for (const event of events) {
        await this.sendEventToBroker(event);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 📌 ШАГ 1 (ТОЛЬКО БАЗА ДАННЫХ):
   * Находит 20 записей со статусом PENDING с защитой от мульти-подов (SKIP LOCKED)
   * и переводит их в статус PROCESSING.
   */
  private async fetchAndLockPendingEvents(): Promise<OutboxEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Ищем 20 записей PENDING
      // FOR UPDATE: блокирует выбранные строки
      // SKIP LOCKED: другие поды в Kubernetes пропустят эти строки и возьмут следующие
      const events: OutboxEntity[] = await queryRunner.manager
        .createQueryBuilder(OutboxEntity, 'outbox')
        .setLock('pessimistic_write') //
        .setOnLocked('skip_locked')
        .where('outbox.status = :status', { status: OutboxStatus.PENDING })
        .orderBy('outbox.createdAt', 'ASC')
        .take(this.batchSize)
        .getMany();

      // 2. Если есть записи — переводим их в статус PROCESSING (взяли в работу)
      for (const event of events) {
        event.status = OutboxStatus.PROCESSING;
        await queryRunner.manager.save(event);
      }

      // 3. Коммитим транзакцию (замки снимаются, в БД зафиксирован статус PROCESSING)
      await queryRunner.commitTransaction();
      return events;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release(); // Обязательно возвращаем коннект в пул
    }
  }

  /**
   * 📌 ШАГ 2 (ТОЛЬКО СЕТЬ И БРОКЕР):
   * Публикует одно событие в брокер сообщений (RabbitMQ / Kafka) и обновляет статус в БД.
   */
  private async sendEventToBroker(event: OutboxEntity): Promise<void> {
    const outboxRepo = this.dataSource.getRepository(OutboxEntity);

    try {
      // 1. Публикуем через абстрактный транспорт
      await this.transport.publish(event);

      // 2. Успех -> переводим в статус PROCESSED с отметкой времени
      await outboxRepo.update(event.id, {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
      });
    } catch (error) {
      // 3. Ошибка сети -> вычисляем ретраи
      const newRetryCount = (event.retryCount || 0) + 1;
      const status =
        newRetryCount >= this.maxRetries
          ? OutboxStatus.FAILED // 5 неудач подряд -> отправляем в статус FAILED
          : OutboxStatus.PENDING; // Есть попытки -> вернется в PENDING для повтора через 2 сек

      this.logger.error(
        `[OutboxService] Сбой отправки #${event.id} (попытка ${newRetryCount}/${this.maxRetries}): ${error.message}`,
      );

      await outboxRepo.update(event.id, {
        status,
        retryCount: newRetryCount,
        lastError: error.message,
      });
    }
  }
}
