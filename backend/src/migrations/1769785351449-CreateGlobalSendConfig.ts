import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateGlobalSendConfig1769785351449 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create table
        await queryRunner.createTable(
            new Table({
                name: 'global_send_config',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'startHour',
                        type: 'int',
                        default: 9,
                        comment: 'Hour to start sending (0-23)',
                    },
                    {
                        name: 'endHour',
                        type: 'int',
                        default: 18,
                        comment: 'Hour to stop sending (0-23)',
                    },
                    {
                        name: 'minDelayMinutes',
                        type: 'int',
                        default: 1,
                        comment: 'Minimum delay in minutes between emails',
                    },
                    {
                        name: 'maxDelayMinutes',
                        type: 'int',
                        default: 5,
                        comment: 'Maximum delay in minutes between emails',
                    },
                    {
                        name: 'enabled',
                        type: 'boolean',
                        default: true,
                        comment: 'Enable/disable time restrictions and delays',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Check if table already has data
        const result = await queryRunner.query(`
      SELECT COUNT(*) as count FROM global_send_config
    `);

        // Only insert if table is empty
        if (result[0].count === '0') {
            await queryRunner.query(`
        INSERT INTO global_send_config (id, "startHour", "endHour", "minDelayMinutes", "maxDelayMinutes", enabled)
        VALUES (1, 9, 18, 1, 5, true)
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('global_send_config');
    }
}
