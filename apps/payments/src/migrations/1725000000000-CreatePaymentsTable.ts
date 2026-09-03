import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1725000000000 implements MigrationInterface {
  name = 'CreatePaymentsTable1725000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "payments"`);

    await queryRunner.query(`
      CREATE TABLE "payments"."payment_entity" (
        "id"             BIGSERIAL           NOT NULL,
        "idempotencyKey" character varying,
        "orderId"        character varying   NOT NULL,
        "amount"         numeric(10,2)       NOT NULL,
        "status"         character varying   NOT NULL DEFAULT 'COMPLETED',
        "email"          character varying   NOT NULL,
        "createdAt"      TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payments_idempotencyKey" ON "payments"."payment_entity" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "payments"."IDX_payments_idempotencyKey"`,
    );
    await queryRunner.query(`DROP TABLE "payments"."payment_entity"`);
    await queryRunner.query(`DROP SCHEMA "payments"`);
  }
}
