/**
 * Migration script to add CV creator columns to clients table
 * Run this script to add creator tracking fields populated by WKF-1.1
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

        console.log('Adding CV creator columns to clients table...');

        // Add the cv_creator_name and cv_creator_email columns
        await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS cv_creator_name VARCHAR(150) NULL,
      ADD COLUMN IF NOT EXISTS cv_creator_email VARCHAR(255) NULL;
    `);

        console.log('✅ Migration completed successfully!');
        console.log('   - Added column: cv_creator_name (VARCHAR(150), nullable)');
        console.log('   - Added column: cv_creator_email (VARCHAR(255), nullable)');
        console.log('   - These columns will be populated by WKF-1.1 when creator is assigned');

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
