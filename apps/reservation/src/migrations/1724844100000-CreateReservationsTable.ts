import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationsTable1724844100000 implements MigrationInterface {
  name = 'CreateReservationsTable1724844100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "reservations"`);

    await queryRunner.query(`
      CREATE TABLE "reservations"."reservation_entity" (
        "id"         BIGSERIAL           NOT NULL,
        "timestamp"  TIMESTAMP           NOT NULL,
        "startDate"  TIMESTAMP           NOT NULL,
        "endDate"    TIMESTAMP           NOT NULL,
        "userId"     BIGINT              NOT NULL,
        "invoiceId"  character varying,
        CONSTRAINT "PK_reservations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_userId" ON "reservations"."reservation_entity" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "reservations"."IDX_reservations_userId"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"."reservation_entity"`);
    await queryRunner.query(`DROP SCHEMA "reservations"`);
  }
}
