const { Client } = require('pg');

async function fixActiveClient() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();

        // First, check the current state
        console.log('🔍 Checking current state...\n');

        const emailCheck = await client.query(`
      SELECT client_id FROM email_sends WHERE id = 30
    `);

        if (emailCheck.rows.length === 0) {
            console.log('❌ Email ID 30 not found');
            return;
        }

        const clientId = emailCheck.rows[0].client_id;
        console.log(`✅ Email 30 belongs to client ID: ${clientId}\n`);

        const settingsCheck = await client.query(`
      SELECT * FROM client_send_settings WHERE client_id = $1
    `, [clientId]);

        if (settingsCheck.rows.length === 0) {
            console.log(`❌ No send_settings found for client ${clientId}`);
            return;
        }

        const currentSettings = settingsCheck.rows[0];
        console.log('Current settings:');
        console.log(`  - active: ${currentSettings.active}`);
        console.log(`  - preview_enabled: ${currentSettings.preview_enabled}\n`);

        if (!currentSettings.active) {
            console.log('⚠️  Client is NOT active. Setting to active...\n');

            const updateResult = await client.query(`
        UPDATE client_send_settings
        SET active = true
        WHERE client_id = $1
        RETURNING *
      `, [clientId]);

            console.log('✅ Updated successfully!');
            console.log('New settings:');
            console.log(`  - active: ${updateResult.rows[0].active}`);
            console.log(`  - preview_enabled: ${updateResult.rows[0].preview_enabled}\n`);

            console.log('🎉 Client is now active and will be checked for responses!');
            console.log('Run: node trigger-sync.js to test');
        } else {
            console.log('✅ Client is already active');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

fixActiveClient();
