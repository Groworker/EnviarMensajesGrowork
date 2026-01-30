const { Client } = require('pg');

async function checkRecentEmails() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();

        const result = await client.query(`
      SELECT 
        id,
        recipient_email,
        status,
        message_id,
        gmail_thread_id,
        sent_at
      FROM email_sends
      WHERE status = 'sent'
      ORDER BY sent_at DESC
      LIMIT 5
    `);

        console.log('\n📧 Recent sent emails:\n');
        result.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. Email ID: ${row.id}`);
            console.log(`   To: ${row.recipient_email}`);
            console.log(`   Message ID: ${row.message_id || 'NULL'}`);
            console.log(`   Thread ID: ${row.gmail_thread_id || '❌ NULL'}`);
            console.log(`   Sent at: ${row.sent_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkRecentEmails();
