const { Client } = require('pg');

async function checkActiveClients() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('🔍 Investigating active clients issue...\n');

        // 1. Check which client sent email ID 30
        console.log('1️⃣ Checking email ID 30:');
        const emailCheck = await client.query(`
      SELECT id, client_id, recipient_email, status, gmail_thread_id
      FROM email_sends
      WHERE id = 30
    `);

        if (emailCheck.rows.length > 0) {
            const email = emailCheck.rows[0];
            console.log(`   Client ID: ${email.client_id}`);
            console.log(`   Recipient: ${email.recipient_email}`);
            console.log(`   Status: ${email.status}`);
            console.log(`   Thread ID: ${email.gmail_thread_id}\n`);

            // 2. Check if this client has send_settings
            console.log(`2️⃣ Checking send_settings for client ${email.client_id}:`);
            const settingsCheck = await client.query(`
        SELECT *
        FROM client_send_settings
        WHERE client_id = $1
      `, [email.client_id]);

            if (settingsCheck.rows.length > 0) {
                const settings = settingsCheck.rows[0];
                console.log(`   ✅ Settings found:`);
                console.log(`   - Active: ${settings.active}`);
                console.log(`   - Preview Enabled: ${settings.preview_enabled}`);
                console.log(`   - Emails per day: ${settings.emails_per_day}\n`);
            } else {
                console.log(`   ❌ NO SEND_SETTINGS FOUND for this client!\n`);
            }

            // 3. Check client details
            console.log(`3️⃣ Checking client ${email.client_id} details:`);
            const clientCheck = await client.query(`
        SELECT id, nombre, apellido, email, email_operativo
        FROM clients
        WHERE id = $1
      `, [email.client_id]);

            if (clientCheck.rows.length > 0) {
                const clientData = clientCheck.rows[0];
                console.log(`   Name: ${clientData.nombre} ${clientData.apellido}`);
                console.log(`   Email: ${clientData.email}`);
                console.log(`   Email Operativo: ${clientData.email_operativo}\n`);
            }
        } else {
            console.log('   ❌ Email ID 30 not found\n');
        }

        // 4. Check all clients with active send_settings
        console.log('4️⃣ Checking ALL active clients:');
        const activeClientsCheck = await client.query(`
      SELECT c.id, c.nombre, c.apellido, s.active, s.preview_enabled
      FROM clients c
      INNER JOIN client_send_settings s ON c.id = s.client_id
      WHERE s.active = true
    `);

        console.log(`   Found ${activeClientsCheck.rows.length} active clients:`);
        activeClientsCheck.rows.forEach(row => {
            console.log(`   - Client ${row.id}: ${row.nombre} ${row.apellido} (active: ${row.active})`);
        });

        if (activeClientsCheck.rows.length === 0) {
            console.log('\n⚠️  NO ACTIVE CLIENTS FOUND!');
            console.log('   This is why the sync is not working.\n');

            // 5. Check if there are ANY send_settings at all
            console.log('5️⃣ Checking if ANY send_settings exist:');
            const allSettingsCheck = await client.query(`
        SELECT client_id, active, preview_enabled
        FROM client_send_settings
        LIMIT 10
      `);

            console.log(`   Total send_settings records: ${allSettingsCheck.rows.length}`);
            allSettingsCheck.rows.forEach(row => {
                console.log(`   - Client ${row.client_id}: active=${row.active}, preview=${row.preview_enabled}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkActiveClients();
