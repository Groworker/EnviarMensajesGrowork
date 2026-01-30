const { Client } = require('pg');

async function verifyThreadIds() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('✓ Connected to database\n');

        // Check total sent emails
        const totalSent = await client.query(`
      SELECT COUNT(*) as count
      FROM email_sends
      WHERE status = 'sent'
    `);

        console.log(`📧 Total emails with status 'sent': ${totalSent.rows[0].count}`);

        // Check emails with threadId
        const withThreadId = await client.query(`
      SELECT COUNT(*) as count
      FROM email_sends
      WHERE status = 'sent' AND gmail_thread_id IS NOT NULL AND gmail_thread_id != ''
    `);

        console.log(`🔗 Emails with threadId: ${withThreadId.rows[0].count}`);

        const percentage = totalSent.rows[0].count > 0
            ? ((withThreadId.rows[0].count / totalSent.rows[0].count) * 100).toFixed(1)
            : 0;

        console.log(`📊 Percentage: ${percentage}%\n`);

        // Show recent emails with threadId
        if (parseInt(withThreadId.rows[0].count) > 0) {
            console.log('Recent emails with threadId:');
            const recentWithThread = await client.query(`
        SELECT 
          id, 
          recipient_email, 
          gmail_thread_id,
          sent_at,
          has_responses,
          response_count
        FROM email_sends
        WHERE status = 'sent' AND gmail_thread_id IS NOT NULL
        ORDER BY sent_at DESC
        LIMIT 5
      `);

            recentWithThread.rows.forEach(row => {
                console.log(`  - ID: ${row.id}, To: ${row.recipient_email}`);
                console.log(`    ThreadID: ${row.gmail_thread_id}`);
                console.log(`    Sent: ${row.sent_at}`);
                console.log(`    Responses: ${row.response_count} (${row.has_responses ? 'Yes' : 'No'})\n`);
            });
        }

        // Show recent emails WITHOUT threadId
        const recentWithoutThread = await client.query(`
      SELECT 
        id, 
        recipient_email, 
        sent_at
      FROM email_sends
      WHERE status = 'sent' AND (gmail_thread_id IS NULL OR gmail_thread_id = '')
      ORDER BY sent_at DESC
      LIMIT 5
    `);

        if (recentWithoutThread.rows.length > 0) {
            console.log('⚠️  Recent emails WITHOUT threadId:');
            recentWithoutThread.rows.forEach(row => {
                console.log(`  - ID: ${row.id}, To: ${row.recipient_email}, Sent: ${row.sent_at}`);
            });
            console.log('\n⚠️  These emails cannot be tracked for responses!\n');
        }

        // Check if there are any responses
        const responsesCount = await client.query('SELECT COUNT(*) as count FROM email_responses');
        console.log(`💬 Total responses in database: ${responsesCount.rows[0].count}`);

        if (parseInt(responsesCount.rows[0].count) > 0) {
            const recentResponses = await client.query(`
        SELECT 
          r.id,
          r.from_email,
          r.subject,
          r.classification,
          r.received_at,
          s.recipient_email as original_recipient
        FROM email_responses r
        JOIN email_sends s ON r.email_send_id = s.id
        ORDER BY r.received_at DESC
        LIMIT 5
      `);

            console.log('\nRecent responses:');
            recentResponses.rows.forEach(row => {
                console.log(`  - From: ${row.from_email}`);
                console.log(`    Subject: ${row.subject}`);
                console.log(`    Classification: ${row.classification}`);
                console.log(`    Received: ${row.received_at}\n`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

verifyThreadIds();
