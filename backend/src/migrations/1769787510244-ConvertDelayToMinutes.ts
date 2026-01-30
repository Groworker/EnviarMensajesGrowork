import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertDelayToMinutes1769787510244 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renombrar columnas de segundos a minutos
        await queryRunner.query(`
            ALTER TABLE "global_send_config" 
            RENAME COLUMN "minDelaySeconds" TO "minDelayMinutes"
        `);

        await queryRunner.query(`
            ALTER TABLE "global_send_config" 
            RENAME COLUMN "maxDelaySeconds" TO "maxDelayMinutes"
        `);

        // Convertir valores existentes de segundos a minutos
        // 30 segundos → 1 minuto (30/60 = 0.5, redondeamos a 1)
        // 120 segundos → 2 minutos
        await queryRunner.query(`
            UPDATE "global_send_config" 
            SET "minDelayMinutes" = GREATEST(1, ROUND("minDelayMinutes"::numeric / 60)),
                "maxDelayMinutes" = GREATEST(1, ROUND("maxDelayMinutes"::numeric / 60))
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Convertir valores de minutos a segundos
        await queryRunner.query(`
            UPDATE "global_send_config" 
            SET "minDelayMinutes" = "minDelayMinutes" * 60,
                "maxDelayMinutes" = "maxDelayMinutes" * 60
        `);

        // Renombrar columnas de vuelta
        await queryRunner.query(`
            ALTER TABLE "global_send_config" 
            RENAME COLUMN "minDelayMinutes" TO "minDelaySeconds"
        `);

        await queryRunner.query(`
            ALTER TABLE "global_send_config" 
            RENAME COLUMN "maxDelayMinutes" TO "maxDelaySeconds"
        `);
    }

}
