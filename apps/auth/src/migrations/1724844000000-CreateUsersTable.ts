import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1724844000000 implements MigrationInterface {
  name = 'CreateUsersTable1724844000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);

    await queryRunner.query(`
      CREATE TABLE "auth"."user_entity" (
        "id"       BIGSERIAL           NOT NULL,
        "email"    character varying   NOT NULL,
        "password" character varying   NOT NULL,
        CONSTRAINT "UQ_auth_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_auth_user_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth"."user_entity"`);
    await queryRunner.query(`DROP SCHEMA "auth"`);
  }
}
