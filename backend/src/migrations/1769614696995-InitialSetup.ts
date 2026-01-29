import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup1769614696995 implements MigrationInterface {
  name = 'InitialSetup1769614696995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create client_send_settings
    await queryRunner.query(
      `CREATE TABLE "client_send_settings" ("id" SERIAL NOT NULL, "client_id" integer NOT NULL, "min_daily_emails" integer NOT NULL DEFAULT '2', "max_daily_emails" integer NOT NULL DEFAULT '5', "current_daily_limit" integer NOT NULL DEFAULT '2', "target_daily_limit" integer NOT NULL DEFAULT '50', "is_warmup_active" boolean NOT NULL DEFAULT true, "matching_criteria" jsonb NOT NULL DEFAULT '{}', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_client_send_settings_client_id" UNIQUE ("client_id"), CONSTRAINT "PK_client_send_settings_id" PRIMARY KEY ("id"))`,
    );

    // Create Enums
    await queryRunner.query(
      `CREATE TYPE "public"."send_jobs_status_enum" AS ENUM('queued', 'running', 'done', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."email_sends_status_enum" AS ENUM('reserved', 'sent', 'failed', 'bounced')`,
    );

    // Create send_jobs
    await queryRunner.query(
      `CREATE TABLE "send_jobs" ("id" SERIAL NOT NULL, "client_id" integer NOT NULL, "scheduled_date" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."send_jobs_status_enum" NOT NULL DEFAULT 'queued', "emails_to_send" integer NOT NULL DEFAULT '0', "emails_sent_count" integer NOT NULL DEFAULT '0', "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "error" text, CONSTRAINT "PK_send_jobs_id" PRIMARY KEY ("id"))`,
    );

    // Create email_sends
    await queryRunner.query(
      `CREATE TABLE "email_sends" ("id" SERIAL NOT NULL, "client_id" integer NOT NULL, "job_offer_id" integer NOT NULL, "send_job_id" integer, "recipient_email" character varying NOT NULL, "status" "public"."email_sends_status_enum" NOT NULL DEFAULT 'reserved', "sent_at" TIMESTAMP NOT NULL DEFAULT now(), "message_id" character varying, "content_snapshot" text, CONSTRAINT "UQ_email_sends_client_recipient" UNIQUE ("client_id", "recipient_email"), CONSTRAINT "UQ_email_sends_client_offer" UNIQUE ("client_id", "job_offer_id"), CONSTRAINT "PK_email_sends_id" PRIMARY KEY ("id"))`,
    );

    // Create email_reputation
    await queryRunner.query(
      `CREATE TABLE "email_reputation" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "is_bounced" boolean NOT NULL DEFAULT false, "is_invalid" boolean NOT NULL DEFAULT false, "bounce_count" integer NOT NULL DEFAULT '0', "last_bounce_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_email_reputation_email" UNIQUE ("email"), CONSTRAINT "PK_email_reputation_id" PRIMARY KEY ("id"))`,
    );

    // Add Foreign Keys
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" ADD CONSTRAINT "FK_client_send_settings_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" ADD CONSTRAINT "FK_send_jobs_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Note: Relation to job_offers. Assuming job_offers table exists as per user description.
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_job_offer" FOREIGN KEY ("job_offer_id") REFERENCES "job_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_send_job" FOREIGN KEY ("send_job_id") REFERENCES "send_jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_send_job"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_job_offer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" DROP CONSTRAINT "FK_send_jobs_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" DROP CONSTRAINT "FK_client_send_settings_client"`,
    );

    // Drop Tables
    await queryRunner.query(`DROP TABLE "email_reputation"`);
    await queryRunner.query(`DROP TABLE "email_sends"`);
    await queryRunner.query(`DROP TYPE "public"."email_sends_status_enum"`);
    await queryRunner.query(`DROP TABLE "send_jobs"`);
    await queryRunner.query(`DROP TYPE "public"."send_jobs_status_enum"`);
    await queryRunner.query(`DROP TABLE "client_send_settings"`);
  }
}
