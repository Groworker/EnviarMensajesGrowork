/**
 * Migration script to refactor CV creator storage
 * Replaces cv_creator_name and cv_creator_email with foreign key to cv_creators table
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

        console.log('Step 1: Removing old columns...');

        // Remove the denormalized columns
        await client.query(`
      ALTER TABLE clients 
      DROP COLUMN IF EXISTS cv_creator_name,
      DROP COLUMN IF EXISTS cv_creator_email;
    `);

        console.log('Step 2: Adding cv_creator_id column with foreign key...');

        // Add foreign key column
        await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS cv_creator_id INTEGER NULL;
    `);

        // Add foreign key constraint
        await client.query(`
      ALTER TABLE clients 
      ADD CONSTRAINT fk_clients_cv_creator 
      FOREIGN KEY (cv_creator_id) 
      REFERENCES cv_creators(id) 
      ON DELETE SET NULL;
    `);

        console.log('✅ Migration completed successfully!');
        console.log('   - Removed: cv_creator_name, cv_creator_email');
        console.log('   - Added: cv_creator_id (INTEGER, foreign key to cv_creators)');
        console.log('   - Constraint: fk_clients_cv_creator with ON DELETE SET NULL');

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
