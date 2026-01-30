const { Client } = require('pg');

async function checkDatabase() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Check if email_responses table exists
        const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'email_responses'
    `);

        if (tableCheck.rows.length > 0) {
            console.log('✓ Table email_responses exists');

            // Get table structure
            const structureCheck = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'email_responses'
        ORDER BY ordinal_position
      `);

            console.log('\nTable structure:');
            structureCheck.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
            });

            // Count responses
            const countCheck = await client.query('SELECT COUNT(*) FROM email_responses');
            console.log(`\n✓ Total responses in database: ${countCheck.rows[0].count}`);

        } else {
            console.log('✗ Table email_responses DOES NOT exist');
            console.log('\n⚠️  The table needs to be created via migration or synchronize');
        }

        // Check email_sends for threadId
        const emailSendsCheck = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(gmail_thread_id) as with_thread_id
      FROM email_sends
      WHERE status = 'sent'
    `);

        console.log(`\n✓ Email sends with status 'sent': ${emailSendsCheck.rows[0].total}`);
        console.log(`  - With threadId: ${emailSendsCheck.rows[0].with_thread_id}`);

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkDatabase();
