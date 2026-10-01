import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToReservations1726700000000 implements MigrationInterface {
  name = 'AddStatusToReservations1726700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"."reservation_entity"
      ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"."reservation_entity"
      DROP COLUMN IF EXISTS "status"
    `);
  }
}
