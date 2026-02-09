const { Client } = require('pg');

async function addCvStatusColumn() {
    const client = new Client({
        host: '62.84.180.150',
        port: 5432,
        user: 'diosdeluniverso',
        password: 'LOF0.f?KF7hfmFRrqb',
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Add cv_status column if it doesn't exist
        const columnExists = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'cv_status'
        `);

        if (columnExists.rows.length === 0) {
            await client.query(`
                ALTER TABLE clients
                ADD COLUMN cv_status VARCHAR(20) DEFAULT 'pendiente'
            `);
            console.log('Column cv_status added to clients table');
        } else {
            console.log('Column cv_status already exists');
        }

        // 2. Auto-populate: if WKF-1.3 = OK for a client, set cv_status = 'finalizado'
        const result = await client.query(`
            UPDATE clients c
            SET cv_status = 'finalizado'
            FROM client_workflow_states cws
            WHERE cws."clientId" = c.id
              AND cws."workflowType" = 'WKF-1.3'
              AND cws.status = 'OK'
              AND (c.cv_status IS NULL OR c.cv_status = 'pendiente')
        `);
        console.log(`Auto-populated cv_status=finalizado for ${result.rowCount} clients (WKF-1.3 = OK)`);

        // 3. Verify
        const verify = await client.query(`
            SELECT cv_status, COUNT(*) as cnt
            FROM clients
            WHERE deleted_at IS NULL
            GROUP BY cv_status
        `);
        console.log('\nCurrent cv_status distribution:');
        verify.rows.forEach(r => console.log(`  ${r.cv_status || 'NULL'}: ${r.cnt}`));

        console.log('\nMigration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await client.end();
    }
}

addCvStatusColumn();
