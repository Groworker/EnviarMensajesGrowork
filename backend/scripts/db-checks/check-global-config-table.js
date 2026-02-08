const { Client } = require('pg');
require('dotenv').config();

async function checkGlobalConfigTable() {
    const client = new Client({
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: process.env.DATABASE_SSL === 'true',
    });

    try {
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check if table exists
        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'global_send_config'
      );
    `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Table global_send_config EXISTS');

            // Show config
            const config = await client.query('SELECT * FROM global_send_config');
            console.log('\n📊 Current configuration:');
            console.log(JSON.stringify(config.rows, null, 2));
        } else {
            console.log('❌ Table global_send_config DOES NOT EXIST');
            console.log('\n💡 Creating table with default values...');

            await client.query(`
        CREATE TABLE global_send_config (
          id SERIAL PRIMARY KEY,
          "startHour" INT DEFAULT 9,
          "endHour" INT DEFAULT 18,
          "minDelaySeconds" INT DEFAULT 30,
          "maxDelaySeconds" INT DEFAULT 120,
          enabled BOOLEAN DEFAULT true,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

            await client.query(`
        INSERT INTO global_send_config (id, "startHour", "endHour", "minDelaySeconds", "maxDelaySeconds", enabled)
        VALUES (1, 9, 18, 30, 120, true);
      `);

            console.log('✅ Table created and default config inserted');

            const config = await client.query('SELECT * FROM global_send_config');
            console.log('\n📊 New configuration:');
            console.log(JSON.stringify(config.rows, null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkGlobalConfigTable();
