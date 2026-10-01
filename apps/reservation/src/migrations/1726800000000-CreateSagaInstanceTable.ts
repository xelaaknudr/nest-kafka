import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSagaInstanceTable1726800000000 implements MigrationInterface {
  name = 'CreateSagaInstanceTable1726800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reservations"."saga_instances" (
        "sagaId" character varying NOT NULL,
        "reservationId" integer NOT NULL,
        "status" character varying NOT NULL,
        "history" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "error" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saga_instances_sagaId" PRIMARY KEY ("sagaId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_saga_instances_status" ON "reservations"."saga_instances" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "reservations"."IDX_saga_instances_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations"."saga_instances"`);
  }
}
