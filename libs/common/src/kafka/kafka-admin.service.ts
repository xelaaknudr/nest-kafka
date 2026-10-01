/**
 * kafka-admin.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Сервис администрирования Kafka (Topic Management).
 *
 * 🎓 SINGLE SOURCE OF TRUTH ДЛЯ ТОПИКОВ И ПАРТИЦИЙ:
 * Этот сервис избавляет от необходимости вручную создавать топики через консоль
 * или полагаться на случайные дефолты брокера.
 *
 * При старте приложения он:
 *  1. Проверяет, какие топики уже существуют в брокере.
 *  2. Создает недостающие топики с их индивидуальным количеством партиций (из KAFKA_TOPIC_CONFIGS).
 *  3. Если топик уже существует, но партиций в нем меньше, чем требуется
 *     (например, было 3, а по ТЗ нужно 12 для payment.created) — безопасно масштабирует их на лету!
 */

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { KAFKA_MODULE_OPTIONS, TOPIC_PARTITIONS } from './kafka.constants';
import { KafkaModuleOptions } from './kafka.interfaces';

@Injectable()
export class KafkaAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KafkaAdminService.name);

  constructor(
    private readonly kafka: Kafka,
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly options: KafkaModuleOptions,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.options.autoCreateTopics) {
      return;
    }

    await this.ensureTopics();
  }

  /**
   * Проверяет и приводит топики брокера в соответствие с TOPIC_PARTITIONS.
   */
  async ensureTopics(): Promise<void> {
    const admin = this.kafka.admin();

    try {
      await admin.connect();
      this.logger.log('Синхронизация топиков и партиций Kafka...');

      // 1. Создаем отсутствующие топики
      const existingTopics = await admin.listTopics();
      const topicsToCreate = Object.entries(TOPIC_PARTITIONS)
        .filter(([topic]) => !existingTopics.includes(topic))
        .map(([topic, numPartitions]) => ({
          topic,
          numPartitions,
          replicationFactor: 1,
        }));

      if (topicsToCreate.length > 0) {
        await admin.createTopics({
          waitForLeaders: true,
          topics: topicsToCreate,
        });

        for (const created of topicsToCreate) {
          this.logger.log(
            `[KafkaAdmin] Создан топик "${created.topic}" (${created.numPartitions} партиций)`,
          );
        }
      }

      // 2. Расширяем партиции существующих топиков (если требуется)
      const metadata = await admin.fetchTopicMetadata({
        topics: Object.keys(TOPIC_PARTITIONS),
      });

      for (const topicMeta of metadata.topics) {
        const desired = TOPIC_PARTITIONS[topicMeta.name];
        const current = topicMeta.partitions.length;

        if (desired && desired > current) {
          this.logger.log(
            `[KafkaAdmin] Расширение партиций для "${topicMeta.name}": ${current} -> ${desired}`,
          );

          await admin.createPartitions({
            topicPartitions: [{ topic: topicMeta.name, count: desired }],
          });
        }
      }

      this.logger.log('[KafkaAdmin] Топики синхронизированы.');
    } catch (error) {
      this.logger.error(
        `[KafkaAdmin] Ошибка синхронизации: ${(error as Error).message}`,
      );
    } finally {
      await admin.disconnect();
    }
  }
}
