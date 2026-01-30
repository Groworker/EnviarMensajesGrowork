import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Client } from '../entities/client.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { SendJob } from '../entities/send-job.entity';
import { EmailSend } from '../entities/email-send.entity';
import { EmailReputation } from '../entities/email-reputation.entity';
import { EmailResponse } from '../entities/email-response.entity';

// Load .env file
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true',
  entities: [
    Client,
    JobOffer,
    ClientSendSettings,
    SendJob,
    EmailSend,
    EmailReputation,
    EmailResponse,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
