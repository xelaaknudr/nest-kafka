import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxTable1725200000000 implements MigrationInterface {
  name = 'CreateOutboxTable1725200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations"."outbox" CASCADE`);

    await queryRunner.query(`
      CREATE TABLE "reservations"."outbox" (
        "id"            BIGSERIAL           NOT NULL,
        "topic"         character varying   NOT NULL,
        "key"           character varying   NOT NULL,
        "aggregateType" character varying   NOT NULL,
        "aggregateId"   character varying   NOT NULL,
        "payload"       jsonb               NOT NULL,
        "status"        character varying   NOT NULL DEFAULT 'PENDING',
        "retryCount"    integer             NOT NULL DEFAULT 0,
        "lastError"     text,
        "createdAt"     TIMESTAMP           NOT NULL DEFAULT now(),
        "processedAt"   TIMESTAMP,
        CONSTRAINT "PK_outbox_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_status_createdAt" ON "reservations"."outbox" ("status", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "reservations"."IDX_outbox_status_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations"."outbox"`);
  }
}
