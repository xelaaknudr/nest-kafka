import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RMQ_EXCHANGES } from './rmq.constants';

/**
 * ============================================================================
 * ИНТЕРФЕЙС НАСТРОЕК РЕТРАЯ (RetryOptions)
 * ============================================================================
 * Описывает параметры, которые консьюмер передает сервису при возникновении сбоя.
 */
export interface RetryOptions {
  /**
   * 1. message: Сырой AMQP-пакет (конверт) сообщения.
   * Зачем нужен: Из него сервис извлекает существующие технические заголовки
   * (headers), в частности текущее число попыток 'x-retry-count'.
   */
  message: any;

  /**
   * 2. payload: Полезная нагрузка (бизнес-данные).
   * Например: { orderId: 'ORD-123', amount: 500 }.
   * Это те самые данные, которые мы должны сохранить и переотправить заново.
   */
  payload: any;

  /**
   * 3. exchange: Имя исходного обменника (куда вернуть сообщение после сна).
   * Пример: RMQ_EXCHANGES.DIRECT_TEST ('direct-test-exchange').
   */
  exchange: string;

  /**
   * 4. routingKey: Исходный ключ маршрутизации.
   * Пример: 'learning.retry.main'.
   * По этому ключу брокер вернет проснувшееся сообщение в ту же самую рабочую очередь.
   */
  routingKey: string;

  /**
   * 5. maxRetries: Максимальное количество попыток обработки.
   * - По умолчанию: 3.
   * - Если передать Infinity: сообщение будет бесконечно повторяться с задержкой,
   *   пока сервис или база данных не оживут.
   */
  maxRetries?: number;

  /**
   * 6. delayMs: Базовое время задержки (сна) между попытками в миллисекундах.
   * - По умолчанию: 3000 мс (3 секунды).
   */
  delayMs?: number;

  /**
   * 7. backoff: Стратегия расчета задержки.
   * - 'fixed': фиксированная пауза (3с -> 3с -> 3с).
   * - 'exponential': экспоненциальная пауза (3с -> 6с -> 12с -> 24с).
   *   Формула: delayMs * (2 ^ attemptIndex).
   */
  backoff?: 'fixed' | 'exponential';

  /**
   * 8. dlxExchange: Обменник для "мертвых писем" (куда сбросить брак при превышении попыток).
   * - По умолчанию: RMQ_EXCHANGES.DLX ('dlx-exchange').
   */
  dlxExchange?: string;

  /**
   * 9. dlxRoutingKey: Кастомный роутинг-ключ для DLX (опционально).
   * Позволяет направить брак в специализированную очередь ошибок конкретного сервиса.
   */
  dlxRoutingKey?: string;

  /**
   * 10. error: Объект ошибки или текст из блока catch (err).
   * Текст этой ошибки будет прикреплен к сообщению в виде метаданных при сбросе в DLQ.
   */
  error?: any;
}

/**
 * ============================================================================
 * СЕРВИС УПРАВЛЕНИЯ РЕТРАЯМИ И DLX (RabbitRetryService)
 * ============================================================================
 * Инкапсулирует в себе всю низкоуровневую работу с протоколом AMQP:
 * 1. Читает и инкрементирует счетчик попыток 'x-retry-count'.
 * 2. Рассчитывает время задержки (с учетом экспоненты).
 * 3. Автоматически создает временные очереди ожидания (Wait Queues) с TTL.
 * 4. Автоматически перенаправляет сообщение в DLX при исчерпании всех попыток.
 */
@Injectable()
export class RabbitRetryService {
  private readonly logger = new Logger(RabbitRetryService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Главный метод обработки сбоя. Вызывается внутри блока catch (err) консьюмера.
   */
  async handleRetry(options: RetryOptions): Promise<void> {
    // ------------------------------------------------------------------------
    // ШАГ 1: Распаковываем переданные опции и задаем дефолтные значения
    // ------------------------------------------------------------------------
    const {
      message,
      payload,
      exchange,
      routingKey,
      maxRetries = 3,
      delayMs = 3000,
      backoff = 'fixed',
      dlxExchange = RMQ_EXCHANGES.DLX,
      dlxRoutingKey = routingKey,
      error,
    } = options;

    // ------------------------------------------------------------------------
    // ШАГ 2: Извлекаем технические заголовки из конверта входящего сообщения
    // ------------------------------------------------------------------------
    const headers = message?.properties?.headers || {};

    // Читаем текущий номер попытки из заголовка 'x-retry-count' (если это 1-й сбой, то там 0)
    const currentRetry = Number(headers['x-retry-count'] || 0);

    // Нормализуем текст ошибки для сохранения в логах и метаданных
    const errorMessage =
      error instanceof Error ? error.message : String(error || 'Unknown Error');

    // ------------------------------------------------------------------------
    // ШАГ 3: Проверяем, остались ли еще попытки (или включен бесконечный ретрай)
    // ------------------------------------------------------------------------
    // Если currentRetry < maxRetries - 1 (например 0 < 2 при лимите 3) -> делаем ретрай
    if (currentRetry < maxRetries - 1 || maxRetries === Infinity) {
      const nextRetry = currentRetry + 1;

      // ----------------------------------------------------------------------
      // ШАГ 4: Вычисляем время паузы (сна)
      // ----------------------------------------------------------------------
      // При 'fixed': 3000мс.
      // При 'exponential':
      //  - Попытка 1: 3000 * 2^0 = 3000мс (3 сек)
      //  - Попытка 2: 3000 * 2^1 = 6000мс (6 сек)
      //  - Попытка 3: 3000 * 2^2 = 12000мс (12 сек)
      const currentDelay =
        backoff === 'exponential'
          ? delayMs * Math.pow(2, currentRetry)
          : delayMs;

      // Формируем уникальное имя очереди ожидания на основе ключа и задержки
      // Пример: "retry-wait.learning.retry.main.3000ms"
      const waitQueueName = `retry-wait.${routingKey}.${currentDelay}ms`;

      this.logger.warn(
        `⏳ [RETRY SERVICE] Сбой обработки (попытка ${nextRetry} из ${maxRetries === Infinity ? '∞' : maxRetries}). ` +
          `Засыпаем на ${currentDelay}мс. Ошибка: "${errorMessage}"`,
      );

      // ----------------------------------------------------------------------
      // ШАГ 5: Создаем Очередь Ожидания (Wait Queue) через assertQueue
      // ----------------------------------------------------------------------
      // ВАЖНО: У этой очереди НЕТ слушателей-воркеров!
      // Мы задаем ей два магических параметра брокера:
      // 1. messageTtl: время жизни сообщения (оно умрет через currentDelay мс).
      // 2. deadLetterExchange + deadLetterRoutingKey: куда брокер ДОЛЖЕН
      //    автоматически вытолкнуть умершее сообщение, когда истечет TTL!
      //    Брокер вытолкнет его ОБРАТНО в наш рабочий exchange по рабочему routingKey!
      await this.amqpConnection.channel.assertQueue(waitQueueName, {
        durable: true,
        messageTtl: currentDelay, // Сообщение живет только указанное число мс
        deadLetterExchange: exchange, // При "смерти" по TTL переслать в рабочий обменник
        deadLetterRoutingKey: routingKey, // С исходным рабочим ключом
      });

      // ----------------------------------------------------------------------
      // ШАГ 6: Отправляем копию сообщения в Очередь Ожидания
      // ----------------------------------------------------------------------
      // Мы прикрепляем обновленный заголовок 'x-retry-count' с новым номером попытки.
      // Сообщение полежит в очереди указанное время, умрет по TTL и само вернется воркеру!
      await this.amqpConnection.channel.sendToQueue(
        waitQueueName,
        Buffer.from(JSON.stringify(payload)),
        {
          headers: {
            ...headers,
            'x-retry-count': nextRetry, // Увеличили счетчик!
            'x-last-error': errorMessage, // Записали текст последней ошибки
            'x-retried-at': new Date().toISOString(), // Записали время ретрая
          },
        },
      );
    } else {
      // ----------------------------------------------------------------------
      // ШАГ 7: Лимит попыток превышен -> Перенаправляем в DLX (Корзину брака)
      // ----------------------------------------------------------------------
      this.logger.error(
        `❌ [RETRY SERVICE] Исчерпан лимит попыток (${maxRetries}) для ключа "${routingKey}"! ` +
          `Отправляем в DLX ("${dlxExchange}")...`,
      );

      // Публикуем сообщение в обменник мертвых писем (DLX)
      // Добавляем блок метаданных _dlxMeta прямо в тело, чтобы дежурный инженер
      // при открытии админки сразу видел полную историю трагедии.
      await this.amqpConnection.publish(
        dlxExchange,
        dlxRoutingKey,
        {
          ...payload,
          _dlxMeta: {
            totalRetries: currentRetry + 1,
            originalExchange: exchange,
            originalRoutingKey: routingKey,
            lastError: errorMessage,
            failedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            ...headers,
            'x-final-dlx': true,
            'x-total-retries': currentRetry + 1,
            'x-failure-reason': errorMessage,
          },
        },
      );
    }
  }
}
