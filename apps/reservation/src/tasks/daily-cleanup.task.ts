/**
 * daily-cleanup.task.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 🚀 PRODUCTION DISTRIBUTED CRON PATTERN ДЛЯ KUBERNETES (5 ПОДОВ)
 *
 * ПРОБЛЕМА MULTI-POD КЛАСТЕРА:
 * В Kubernetes запущено 5 реплик (подов) сервиса reservation:
 *   - reservation-pod-1
 *   - reservation-pod-2
 *   - reservation-pod-3
 *   - reservation-pod-4
 *   - reservation-pod-5
 *
 * В коде каждого пода работает шедулер: @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT).
 * Ровно в полночь (00:00:00) таймер сработает НА ВСЕХ 5 ПОДАХ ОДНОВРЕМЕННО!
 *
 * Без распределённого лока:
 *   💥 Все 5 подов одновременно полезут чистить БД, отправлять клиентам email-отчёты
 *      и списывать деньги → дубликаты, дедлоки, скандал.
 *
 * С REDLOCK:
 *   🏆 Только ОДИН под успевает первым захватить замок `cron:reservation:daily-cleanup`.
 *   🛡️ Остальные 4 пода получают отказ (retryCount: 0), логируют пропуск и мирно засыпают.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redlock from 'redlock';
import { REDLOCK_CLIENT } from '@app/common';

@Injectable()
export class DailyCleanupTask {
  private readonly logger = new Logger(DailyCleanupTask.name);

  constructor(@Inject(REDLOCK_CLIENT) private readonly redlock: Redlock) {}

  /**
   * ⏰ НАСТОЯЩИЙ КРОН РАЗ В 24 ЧАСА (в полночь):
   * В продакшене вызывается шедулером NestJS ровно в 00:00:00.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runScheduledDailyCleanup() {
    const podId = process.env.HOSTNAME || `pod-${Math.random().toString(36).substring(2, 7)}`;
    return this.executeWithDistributedLock(podId);
  }

  /**
   * Ядро распределённого выполнения:
   * Гарантирует выполнение ровно 1 раз среди любого количества параллельных подов.
   */
  async executeWithDistributedLock(podId: string) {
    const lockResource = 'cron:reservation:daily-cleanup';

    // Замок берётся на 5 минут (300 000 мс) с запасом на время выполнения очистки
    const LOCK_TTL_MS = 5 * 60 * 1000;

    this.logger.log(`[Pod: ${podId}] ⏰ Сработал шедулер 24h! Пытаюсь захватить распределённый замок...`);

    let lock;
    try {
      // ⚠️ ВАЖНО: retryCount: 0!
      // Для крона нам НЕ нужны повторные попытки через 200мс.
      // Если другой под уже начал работу — мы должны СРАЗУ выйти (skip).
      lock = await this.redlock.acquire([lockResource], LOCK_TTL_MS, {
        retryCount: 0,
      });
    } catch {
      // 🛡️ Замок занят другим подом в кластере!
      this.logger.warn(
        `[Pod: ${podId}] ⏸️ ПРОПУСК: Замок уже захвачен другим подом кластера. Засыпаю.`,
      );
      return {
        podId,
        status: 'SKIPPED',
        reason: 'Замок уже захвачен другим подом. Дублирование предотвращено ✅',
      };
    }

    // 🏆 Сюда попадёт РОВНО ОДИН ПОД из всех 5 подов!
    try {
      this.logger.log(
        `[Pod: ${podId}] 🏆 ПОБЕДИТЕЛЬ: Замок получен! Выполняю ежедневную очистку...`,
      );

      // Выполняем полезную нагрузку
      const result = await this.performHeavyCleanup();

      this.logger.log(
        `[Pod: ${podId}] ✅ Ежедневная очистка успешно завершена: архив=${result.archivedReservationsCount} записей`,
      );

      return {
        podId,
        status: 'EXECUTED_SUCCESSFULLY',
        message: 'Джоба выполнена ровно один раз на победившем поде ✅',
        details: result,
      };
    } catch (error: any) {
      this.logger.error(`[Pod: ${podId}] ❌ Ошибка при выполнении джобы: ${error.message}`);
      throw error;
    } finally {
      // Освобождаем замок, чтобы завтра в полночь джоба снова смогла запуститься
      await lock.release();
      this.logger.log(`[Pod: ${podId}] 🔓 Замок освобождён.`);
    }
  }

  /**
   * Тяжелая бизнес-логика (архивация бронирований, удаление протухших токенов)
   */
  private async performHeavyCleanup() {
    // Имитация работы с БД (100 мс)
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      archivedReservationsCount: 142,
      cleanedExpiredSessionsCount: 3890,
      completedAt: new Date().toISOString(),
    };
  }
}
