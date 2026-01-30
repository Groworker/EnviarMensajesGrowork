/**
 * Script para actualizar target_daily_limit a 25 para registros antiguos
 * Ejecutar con: npm run script:update-limits
 */
const { createDbClient } = require('../config');

async function updateTargetLimits() {
  const client = await createDbClient();

  try {
    // Actualizar registros con target_daily_limit < 25 a 25
    const query = `
      UPDATE client_send_settings
      SET target_daily_limit = 25
      WHERE target_daily_limit < 25
      RETURNING id, target_daily_limit;
    `;

    const result = await client.query(query);

    console.log(`\n${result.rowCount} registros actualizados a target_daily_limit = 25`);

    if (result.rows.length > 0) {
      console.log('\nRegistros actualizados:');
      result.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Nuevo target: ${row.target_daily_limit}`);
      });
    }

    return result.rows;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

updateTargetLimits()
  .then(() => {
    console.log('\nScript completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript fallo:', error);
    process.exit(1);
  });
