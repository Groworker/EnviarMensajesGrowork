import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailResponses1738300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add response tracking columns to email_sends table
    await queryRunner.query(`
      ALTER TABLE email_sends
      ADD COLUMN IF NOT EXISTS gmail_thread_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS has_responses BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0
    `);

    // 2. Create index on gmail_thread_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_sends_gmail_thread_id
      ON email_sends(gmail_thread_id)
      WHERE gmail_thread_id IS NOT NULL
    `);

    // 3. Create enum type for response classification
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_responses_classification_enum') THEN
          CREATE TYPE email_responses_classification_enum AS ENUM (
            'negativa',
            'automatica',
            'entrevista',
            'mas_informacion',
            'contratado',
            'sin_clasificar'
          );
        END IF;
      END $$;
    `);

    // 4. Create email_responses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_responses (
        id SERIAL PRIMARY KEY,
        email_send_id INTEGER NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
        gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
        gmail_thread_id VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255),
        subject TEXT NOT NULL,
        body_text TEXT,
        body_html TEXT,
        classification email_responses_classification_enum DEFAULT 'sin_clasificar',
        classification_confidence DECIMAL(3, 2),
        classification_reasoning TEXT,
        classified_at TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE,
        received_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_email_send_id
      ON email_responses(email_send_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_gmail_thread_id
      ON email_responses(gmail_thread_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_classification
      ON email_responses(classification)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_is_read
      ON email_responses(is_read)
      WHERE is_read = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_received_at
      ON email_responses(received_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_received_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_is_read`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_classification`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_gmail_thread_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_email_send_id`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS email_responses`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS email_responses_classification_enum`);

    // Drop index from email_sends
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_sends_gmail_thread_id`);

    // Remove columns from email_sends
    await queryRunner.query(`
      ALTER TABLE email_sends
      DROP COLUMN IF EXISTS gmail_thread_id,
      DROP COLUMN IF EXISTS has_responses,
      DROP COLUMN IF EXISTS last_response_at,
      DROP COLUMN IF EXISTS response_count
    `);
  }
}
