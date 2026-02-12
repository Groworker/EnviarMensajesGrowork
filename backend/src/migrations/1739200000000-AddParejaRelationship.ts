import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParejaRelationship1739200000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add pareja_id column (self-referencing FK)
        await queryRunner.query(`
            ALTER TABLE "clients"
            ADD COLUMN "pareja_id" integer NULL
        `);

        // Add is_primary_partner column
        await queryRunner.query(`
            ALTER TABLE "clients"
            ADD COLUMN "is_primary_partner" boolean NULL DEFAULT NULL
        `);

        // Add foreign key constraint with ON DELETE SET NULL
        await queryRunner.query(`
            ALTER TABLE "clients"
            ADD CONSTRAINT "FK_clients_pareja"
            FOREIGN KEY ("pareja_id") REFERENCES "clients"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // Add index for efficient lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_clients_pareja_id" ON "clients" ("pareja_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_clients_pareja_id"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_pareja"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "is_primary_partner"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "pareja_id"`);
    }
}
