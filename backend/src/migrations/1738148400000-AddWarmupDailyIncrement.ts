import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarmupDailyIncrement1738148400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna warmup_daily_increment
    await queryRunner.query(`
      ALTER TABLE client_send_settings
      ADD COLUMN warmup_daily_increment INTEGER NOT NULL DEFAULT 2
    `);

    // 2. Cambiar el default de target_daily_limit a 25
    await queryRunner.query(`
      ALTER TABLE client_send_settings
      ALTER COLUMN target_daily_limit SET DEFAULT 25
    `);

    // 3. Actualizar registros existentes con target_daily_limit > 50 a 25
    await queryRunner.query(`
      UPDATE client_send_settings
      SET target_daily_limit = 25
      WHERE target_daily_limit > 50
    `);

    // 4. Inicializar current_daily_limit entre 3-6 para registros que estén en 2
    await queryRunner.query(`
      UPDATE client_send_settings
      SET current_daily_limit = 3 + floor(random() * 4)::int
      WHERE current_daily_limit <= 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios
    await queryRunner.query(`
      ALTER TABLE client_send_settings
      DROP COLUMN warmup_daily_increment
    `);

    await queryRunner.query(`
      ALTER TABLE client_send_settings
      ALTER COLUMN target_daily_limit SET DEFAULT 50
    `);
  }
}
