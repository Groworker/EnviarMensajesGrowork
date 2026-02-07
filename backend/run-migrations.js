const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = new Client({
    host: '62.84.180.150',
    port: 5432,
    database: 'postgres',
    user: 'diosdeluniverso',
    password: 'LOF0.f?KF7hfmFRrqb',
    ssl: false
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Read SQL file (use fix-triggers.sql if it exists, otherwise run-migrations.sql)
    const fixTriggersPath = path.join(__dirname, 'fix-triggers.sql');
    const runMigrationsPath = path.join(__dirname, 'run-migrations.sql');

    const sqlFilePath = fs.existsSync(fixTriggersPath) ? fixTriggersPath : runMigrationsPath;
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`📄 Ejecutando: ${path.basename(sqlFilePath)}\n`);

    console.log('📝 Ejecutando migraciones SQL...\n');

    // Execute SQL
    const result = await client.query(sql);

    console.log('✅ Migraciones ejecutadas exitosamente!\n');

    // Show results if any
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Resultados:');
      console.table(result.rows);
    }

    // Verify tables were created
    console.log('\n🔍 Verificando tablas creadas...');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('client_workflow_states', 'cv_creators')
      ORDER BY table_name;
    `;

    const tables = await client.query(verifyQuery);
    console.log('✅ Tablas creadas:');
    console.table(tables.rows);

    // Count rows
    console.log('\n📊 Conteo de filas:');
    const countWorkflow = await client.query('SELECT COUNT(*) as count FROM client_workflow_states');
    const countCreators = await client.query('SELECT COUNT(*) as count FROM cv_creators');

    console.log(`- client_workflow_states: ${countWorkflow.rows[0].count} filas`);
    console.log(`- cv_creators: ${countCreators.rows[0].count} filas`);

  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    console.error('\nDetalles del error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

runMigrations();
