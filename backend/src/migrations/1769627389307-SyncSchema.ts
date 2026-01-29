import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncSchema1769627389307 implements MigrationInterface {
  name = 'SyncSchema1769627389307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" DROP CONSTRAINT "FK_client_send_settings_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" DROP CONSTRAINT "job_offers_execution_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" DROP CONSTRAINT "FK_send_jobs_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_job_offer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_email_sends_send_job"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_clients_nombre"`);
    await queryRunner.query(`DROP INDEX "public"."ix_job_offers_id"`);
    await queryRunner.query(`DROP INDEX "public"."ix_job_offers_email"`);
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "UQ_email_sends_client_recipient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "UQ_email_sends_client_offer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "phone" character varying(50)`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "address" text`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "drive_client_folder_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "drive_cv_folder_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "drive_cv_old_folder_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "drive_cv_new_folder_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "drive_cv_definitiva_folder_url" text`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "notes" text`);
    await queryRunner.query(
      `CREATE INDEX "IDX_a590ac15c1e78a178a7fee4b13" ON "clients" ("nombre") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b48860677afe62cd96e1265948" ON "clients" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a54d36bd6829979f945defdeb" ON "job_offers" ("id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_670fe2f63344cf53259946d20a" ON "job_offers" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "UQ_6f5f3a3ff3b8f07aeaba86ec340" UNIQUE ("client_id", "recipient_email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "UQ_43391eeb76444cb7ca6482685d7" UNIQUE ("client_id", "job_offer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" ADD CONSTRAINT "FK_7db698defe51ea4699687834628" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" ADD CONSTRAINT "FK_521520f245e443b5b2334edc62b" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_c3caa4fe67d3aac214f58155a6b" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_491d9da273d533fc1889478c1bc" FOREIGN KEY ("job_offer_id") REFERENCES "job_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_9974599fee741cbae2df0675adc" FOREIGN KEY ("send_job_id") REFERENCES "send_jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_9974599fee741cbae2df0675adc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_491d9da273d533fc1889478c1bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "FK_c3caa4fe67d3aac214f58155a6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" DROP CONSTRAINT "FK_521520f245e443b5b2334edc62b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" DROP CONSTRAINT "FK_7db698defe51ea4699687834628"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "UQ_43391eeb76444cb7ca6482685d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" DROP CONSTRAINT "UQ_6f5f3a3ff3b8f07aeaba86ec340"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_670fe2f63344cf53259946d20a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a54d36bd6829979f945defdeb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b48860677afe62cd96e1265948"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a590ac15c1e78a178a7fee4b13"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "notes"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "drive_cv_definitiva_folder_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "drive_cv_new_folder_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "drive_cv_old_folder_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "drive_cv_folder_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "drive_client_folder_url"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "address"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "email"`);
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "UQ_email_sends_client_offer" UNIQUE ("client_id", "job_offer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "UQ_email_sends_client_recipient" UNIQUE ("client_id", "recipient_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_job_offers_email" ON "job_offers" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_job_offers_id" ON "job_offers" ("id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_clients_nombre" ON "clients" ("nombre") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_send_job" FOREIGN KEY ("send_job_id") REFERENCES "send_jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_job_offer" FOREIGN KEY ("job_offer_id") REFERENCES "job_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_sends" ADD CONSTRAINT "FK_email_sends_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "send_jobs" ADD CONSTRAINT "FK_send_jobs_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "scrape_executions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_send_settings" ADD CONSTRAINT "FK_client_send_settings_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
