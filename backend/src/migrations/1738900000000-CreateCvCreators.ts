import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCvCreators1738900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cv_creators table
    await queryRunner.createTable(
      new Table({
        name: 'cv_creators',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'ingles',
            type: 'boolean',
            default: false,
          },
          {
            name: 'aleman',
            type: 'boolean',
            default: false,
          },
          {
            name: 'frances',
            type: 'boolean',
            default: false,
          },
          {
            name: 'italiano',
            type: 'boolean',
            default: false,
          },
          {
            name: 'activo',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
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

    // Create index on nombre
    await queryRunner.createIndex(
      'cv_creators',
      new TableIndex({
        name: 'IDX_cv_creators_nombre',
        columnNames: ['nombre'],
      }),
    );

    // Create index on email
    await queryRunner.createIndex(
      'cv_creators',
      new TableIndex({
        name: 'IDX_cv_creators_email',
        columnNames: ['email'],
      }),
    );

    // Seed initial data (optional - puedes agregar tus creadores existentes aquí)
    await queryRunner.query(`
      INSERT INTO cv_creators (nombre, email, ingles, aleman, frances, italiano, activo)
      VALUES
        ('Creador Ejemplo', 'creador@example.com', true, true, false, false, true)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cv_creators');
  }
}
