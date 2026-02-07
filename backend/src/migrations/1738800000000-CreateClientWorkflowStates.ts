import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClientWorkflowStates1738800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create client_workflow_states table
    await queryRunner.createTable(
      new Table({
        name: 'client_workflow_states',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'clientId',
            type: 'int',
          },
          {
            name: 'workflowType',
            type: 'enum',
            enum: ['WKF-1', 'WKF-1.1', 'WKF-1.2', 'WKF-1.3', 'WKF-4'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'OK', 'ERROR'],
            default: "'PENDING'",
          },
          {
            name: 'executionUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'executedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on clientId
    await queryRunner.createIndex(
      'client_workflow_states',
      new TableIndex({
        name: 'IDX_client_workflow_states_clientId',
        columnNames: ['clientId'],
      }),
    );

    // Create index on workflowType
    await queryRunner.createIndex(
      'client_workflow_states',
      new TableIndex({
        name: 'IDX_client_workflow_states_workflowType',
        columnNames: ['workflowType'],
      }),
    );

    // Create unique index on clientId + workflowType
    await queryRunner.createIndex(
      'client_workflow_states',
      new TableIndex({
        name: 'IDX_client_workflow_states_clientId_workflowType',
        columnNames: ['clientId', 'workflowType'],
        isUnique: true,
      }),
    );

    // Create foreign key to clients table
    await queryRunner.createForeignKey(
      'client_workflow_states',
      new TableForeignKey({
        name: 'FK_client_workflow_states_clientId',
        columnNames: ['clientId'],
        referencedTableName: 'clients',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Seed initial PENDING states for all existing clients
    await queryRunner.query(`
      INSERT INTO client_workflow_states ("clientId", "workflowType", status)
      SELECT
        c.id,
        workflow_type,
        'PENDING'
      FROM clients c
      CROSS JOIN (
        SELECT 'WKF-1' as workflow_type
        UNION ALL SELECT 'WKF-1.1'
        UNION ALL SELECT 'WKF-1.2'
        UNION ALL SELECT 'WKF-1.3'
        UNION ALL SELECT 'WKF-4'
      ) workflows
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('client_workflow_states');
  }
}
