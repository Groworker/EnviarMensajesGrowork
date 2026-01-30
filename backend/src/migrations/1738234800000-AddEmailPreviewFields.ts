import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailPreviewFields1738234800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns to email_sends table
    await queryRunner.query(`
      ALTER TABLE email_sends
      ADD COLUMN IF NOT EXISTS subject_snapshot TEXT,
      ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50),
      ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
    `);

    // 2. Add preview_enabled column to client_send_settings
    await queryRunner.query(`
      ALTER TABLE client_send_settings
      ADD COLUMN IF NOT EXISTS preview_enabled BOOLEAN DEFAULT TRUE
    `);

    // 2. Add new enum values for status
    // PostgreSQL requires adding enum values outside of transaction
    // We need to check if values exist before adding them
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'pending_review'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'email_sends_status_enum')
        ) THEN
          ALTER TYPE email_sends_status_enum ADD VALUE 'pending_review';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'approved'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'email_sends_status_enum')
        ) THEN
          ALTER TYPE email_sends_status_enum ADD VALUE 'approved';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'rejected'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'email_sends_status_enum')
        ) THEN
          ALTER TYPE email_sends_status_enum ADD VALUE 'rejected';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns (enum values cannot be easily removed in PostgreSQL)
    await queryRunner.query(`
      ALTER TABLE email_sends
      DROP COLUMN IF EXISTS subject_snapshot,
      DROP COLUMN IF EXISTS ai_generated,
      DROP COLUMN IF EXISTS ai_model,
      DROP COLUMN IF EXISTS attachments_count,
      DROP COLUMN IF EXISTS reviewed_at
    `);

    await queryRunner.query(`
      ALTER TABLE client_send_settings
      DROP COLUMN IF EXISTS preview_enabled
    `);
  }
}
