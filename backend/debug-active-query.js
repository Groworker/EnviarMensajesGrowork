const { Client } = require('pg');

async function debugActiveClientsQuery() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('🔍 Debugging the exact query used by ResponseSyncService...\n');

        // This is the exact query that ResponseSyncService uses
        // It's trying to find clients with sendSettings.active = true

        // First, let me check the table structure
        console.log('1️⃣ Table structure check:');
        const tableCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'client_send_settings'
      ORDER BY ordinal_position
    `);

        console.log('   client_send_settings columns:');
        tableCheck.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        console.log('');

        // Check what the ResponseSyncService query would return
        // It uses TypeORM with relations, which is complex, so let's simulate it
        console.log('2️⃣ Simulating TypeORM query for active clients:');

        // TypeORM query would be something like:
        // SELECT * FROM clients c 
        // INNER JOIN client_send_settings s ON c.id = s.client_id
        // WHERE s.active = true

        const activeClientsQuery = await client.query(`
      SELECT c.id, c.nombre, c.apellido, c.email, c.email_operativo,
             s.active, s.preview_enabled
      FROM clients c
      INNER JOIN client_send_settings s ON c.id = s.client_id
      WHERE s.active = true
    `);

        console.log(`   Found ${activeClientsQuery.rows.length} active clients:\n`);

        if (activeClientsQuery.rows.length > 0) {
            activeClientsQuery.rows.forEach(row => {
                console.log(`   ✅ Client ${row.id}:`);
                console.log(`      Name: ${row.nombre} ${row.apellido}`);
                console.log(`      Email: ${row.email_operativo || row.email}`);
                console.log(`      Active: ${row.active}`);
                console.log(`      Preview: ${row.preview_enabled}\n`);
            });
        } else {
            console.log('   ❌ NO ACTIVE CLIENTS FOUND!\n');

            // Let's check if there are ANY clients with send_settings
            console.log('3️⃣ Checking ALL clients with send_settings:');
            const allClientsQuery = await client.query(`
        SELECT c.id, c.nombre, s.active
        FROM clients c
        INNER JOIN client_send_settings s ON c.id = s.client_id
      `);

            console.log(`   Total clients with send_settings: ${allClientsQuery.rows.length}\n`);
            allClientsQuery.rows.forEach(row => {
                console.log(`   - Client ${row.id} (${row.nombre}): active = ${row.active}`);
            });
        }

        // Check specifically for client 30
        console.log('\n4️⃣ Checking specifically for client 30:');
        const client30Query = await client.query(`
      SELECT c.id, c.nombre, s.active, s.preview_enabled
      FROM clients c
      LEFT JOIN client_send_settings s ON c.id = s.client_id
      WHERE c.id = 30
    `);

        if (client30Query.rows.length > 0) {
            const row = client30Query.rows[0];
            console.log(`   Client 30: ${row.nombre}`);
            console.log(`   Has send_settings: ${row.active !== null ? 'Yes' : 'No'}`);
            if (row.active !== null) {
                console.log(`   Active: ${row.active}`);
                console.log(`   Preview: ${row.preview_enabled}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

debugActiveClientsQuery();
