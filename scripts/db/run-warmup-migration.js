/**
 * Script para ejecutar la migracion de warmup
 * Ejecutar con: npm run script:warmup-migration
 */
const { createDbClient } = require('../config');

async function runMigration() {
  const client = await createDbClient();

  try {
    // 1. Agregar columna warmup_daily_increment
    console.log('\nAgregando columna warmup_daily_increment...');
    await client.query(`
      ALTER TABLE client_send_settings
      ADD COLUMN IF NOT EXISTS warmup_daily_increment INTEGER NOT NULL DEFAULT 2
    `);
    console.log('Columna warmup_daily_increment agregada');

    // 2. Cambiar el default de target_daily_limit a 25
    console.log('\nCambiando default de target_daily_limit a 25...');
    await client.query(`
      ALTER TABLE client_send_settings
      ALTER COLUMN target_daily_limit SET DEFAULT 25
    `);
    console.log('Default de target_daily_limit actualizado');

    // 3. Actualizar registros existentes con target_daily_limit > 50 a 25
    console.log('\nActualizando registros existentes con target > 50...');
    const updateResult = await client.query(`
      UPDATE client_send_settings
      SET target_daily_limit = 25
      WHERE target_daily_limit > 50
      RETURNING id
    `);
    console.log(`${updateResult.rowCount} registros actualizados`);

    // 4. Inicializar current_daily_limit entre 3-6 para registros que esten en 2
    console.log('\nInicializando current_daily_limit entre 3-6...');
    const initResult = await client.query(`
      UPDATE client_send_settings
      SET current_daily_limit = 3 + floor(random() * 4)::int
      WHERE current_daily_limit <= 2
      RETURNING id, current_daily_limit
    `);
    console.log(`${initResult.rowCount} registros inicializados`);
    if (initResult.rows.length > 0) {
      initResult.rows.forEach(row => {
        console.log(`   - ID ${row.id}: currentDailyLimit = ${row.current_daily_limit}`);
      });
    }

    console.log('\nMigracion completada exitosamente!');

  } catch (error) {
    console.error('\nError ejecutando migracion:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('\nScript completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript fallo:', error);
    process.exit(1);
  });
