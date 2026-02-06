import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailThreadingFields1738960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add threading fields to email_responses table to properly track email conversation chains
    await queryRunner.query(`
      ALTER TABLE email_responses
      ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(500),
      ADD COLUMN IF NOT EXISTS references_header TEXT
    `);

    // Create index for faster lookups by in_reply_to
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_responses_in_reply_to
      ON email_responses(in_reply_to)
      WHERE in_reply_to IS NOT NULL
    `);

    // Add comment to document the purpose of these fields
    await queryRunner.query(`
      COMMENT ON COLUMN email_responses.in_reply_to IS 'Message-ID of the email this is replying to (from In-Reply-To header)';
      COMMENT ON COLUMN email_responses.references_header IS 'Complete References header chain from the received email';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_responses_in_reply_to`);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE email_responses
      DROP COLUMN IF EXISTS in_reply_to,
      DROP COLUMN IF EXISTS references_header
    `);
  }
}
