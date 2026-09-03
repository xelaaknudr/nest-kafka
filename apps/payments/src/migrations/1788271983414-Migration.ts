import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1788271983414 implements MigrationInterface {
    name = 'Migration1788271983414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "payments"."IDX_payments_idempotencyKey"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" DROP CONSTRAINT "PK_payments_id"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" ADD CONSTRAINT "PK_6c397c81035bd5b42d16ef3bc70" PRIMARY KEY ("id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_24ea8cb3eba19fb1df688197a1" ON "payments"."payment_entity" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "payments"."IDX_24ea8cb3eba19fb1df688197a1"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" DROP CONSTRAINT "PK_6c397c81035bd5b42d16ef3bc70"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments"."payment_entity" ADD CONSTRAINT "PK_payments_id" PRIMARY KEY ("id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payments_idempotencyKey" ON "payments"."payment_entity" ("idempotencyKey") WHERE ("idempotencyKey" IS NOT NULL)`);
    }

}
