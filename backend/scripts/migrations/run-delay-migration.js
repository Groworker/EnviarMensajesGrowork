require('dotenv').config();
const { Client } = require('pg');

async function runMigration() {
    const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Check current column names
        console.log('\n📋 Checking current table structure...');
        const checkCols = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'global_send_config'
            AND column_name LIKE '%elay%'
            ORDER BY ordinal_position
        `);
        console.log('Current delay columns:', checkCols.rows);

        // Only run migration if columns exist with old names
        if (checkCols.rows.some(r => r.column_name.includes('Second'))) {
            console.log('\n🔄 Found old column names, running migration...\n');

            // Rename columns
            await client.query(`
                ALTER TABLE "global_send_config" 
                RENAME COLUMN "minDelaySeconds" TO "minDelayMinutes"
            `);
            console.log('  ✓ Renamed minDelaySeconds → minDelayMinutes');

            await client.query(`
                ALTER TABLE "global_send_config" 
                RENAME COLUMN "maxDelaySeconds" TO "maxDelayMinutes"
            `);
            console.log('  ✓ Renamed maxDelaySeconds → maxDelayMinutes');

            // Convert values from seconds to minutes
            await client.query(`
                UPDATE "global_send_config" 
                SET "minDelayMinutes" = GREATEST(1, ROUND("minDelayMinutes"::numeric / 60)),
                    "maxDelayMinutes" = GREATEST(1, ROUND("maxDelayMinutes"::numeric / 60))
            `);
            console.log('  ✓ Converted values: seconds → minutes\n');

        } else if (checkCols.rows.some(r => r.column_name.includes('Minute'))) {
            console.log('\n⚠️  Columns already migrated to minutes, skipping...\n');
        } else {
            console.log('\n❌ No delay columns found!\n');
        }

        // Show final result
        console.log('📊 Final table structure:');
        const finalCols = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'global_send_config'
            ORDER BY ordinal_position
        `);
        console.table(finalCols.rows);

        // Show current values
        console.log('\n💾 Current config values:');
        const values = await client.query(
            'SELECT * FROM global_send_config WHERE id = 1'
        );
        if (values.rows.length > 0) {
            console.table(values.rows[0]);
        } else {
            console.log('  ⚠️  No config record found');
        }

    } catch (error) {
        console.error('\n❌ Migration error:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Disconnected from database');
    }
}

runMigration()
    .then(() => {
        console.log('\n✅ Migration completed successfully!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed\n');
        process.exit(1);
    });
