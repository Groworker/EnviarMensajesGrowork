const { Client } = require('pg');

async function renameWkf4ToWkf14() {
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

        // 1. Check current enum values for workflow_type_enum
        const enumCheck = await client.query(`
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'workflow_type_enum'
            ORDER BY e.enumsortorder
        `);
        console.log('Current workflow_type_enum values:', enumCheck.rows.map(r => r.enumlabel));

        // 2. Add 'WKF-1.4' to the workflow_type_enum if not present
        const hasWkf14 = enumCheck.rows.some(r => r.enumlabel === 'WKF-1.4');
        if (!hasWkf14) {
            await client.query(`
                ALTER TYPE workflow_type_enum ADD VALUE IF NOT EXISTS 'WKF-1.4'
            `);
            console.log('Added WKF-1.4 to workflow_type_enum');
        } else {
            console.log('WKF-1.4 already exists in workflow_type_enum');
        }

        // 3. Update existing rows from WKF-4 to WKF-1.4
        const updateResult = await client.query(`
            UPDATE client_workflow_states
            SET "workflowType" = 'WKF-1.4'::workflow_type_enum
            WHERE "workflowType" = 'WKF-4'::workflow_type_enum
        `);
        console.log(`Updated ${updateResult.rowCount} workflow state rows from WKF-4 to WKF-1.4`);

        // 4. Update notification rows (type is varchar, no enum cast needed)
        const notifUpdateResult = await client.query(`
            UPDATE notifications
            SET type = 'workflow_wkf1_4'
            WHERE type = 'workflow_wkf4'
        `);
        console.log(`Updated ${notifUpdateResult.rowCount} notification rows from workflow_wkf4 to workflow_wkf1_4`);

        // 5. Verify workflow states
        const verify = await client.query(`
            SELECT "workflowType", COUNT(*) as cnt
            FROM client_workflow_states
            GROUP BY "workflowType"
            ORDER BY "workflowType"
        `);
        console.log('\nCurrent workflowType distribution:');
        verify.rows.forEach(r => console.log(`  ${r.workflowType}: ${r.cnt}`));

        console.log('\nMigration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await client.end();
    }
}

renameWkf4ToWkf14();
