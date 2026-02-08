const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionConfig = {
    host: '62.84.180.150',
    port: 5432,
    user: 'diosdeluniverso',
    password: 'LOF0.f?KF7hfmFRrqb',
    database: 'postgres',
    ssl: false
};

async function runMigration() {
    const client = new Client(connectionConfig);

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Read SQL file
        const sqlFile = path.join(__dirname, 'add-notifications-and-deletion-tracking.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📄 Executing migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');

        // Update existing clients with tracking fields
        console.log('📄 Updating existing client records...');

        await client.query(`
      UPDATE clients 
      SET estado_changed_at = updated_at 
      WHERE estado_changed_at IS NULL AND updated_at IS NOT NULL;
    `);

        await client.query(`
      UPDATE clients c
      SET last_email_sent_at = (
        SELECT MAX(e.sent_at)
        FROM email_sends e
        WHERE e.client_id = c.id AND e.status = 'sent'
      )
      WHERE last_email_sent_at IS NULL;
    `);

        console.log('✅ Existing records updated!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
