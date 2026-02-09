/**
 * Migration script to add idioma_cv column to clients table
 * Run this script to add the CV language field that is synced from Zoho CRM
 */

const { Pool } = require('pg');

async function runMigration() {
    const pool = new Pool({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
        ssl: false,
    });

    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log('Adding idioma_cv column to clients table...');

        // Add the idioma_cv column
        await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS idioma_cv VARCHAR(50) NULL;
    `);

        console.log('✅ Migration completed successfully!');
        console.log('   - Added column: idioma_cv (VARCHAR(50), nullable)');
        console.log('   - This column will be populated by Zoho CRM sync from field: Idioma_que_quiere_CV');

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
