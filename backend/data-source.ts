import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Client } from './src/entities/client.entity';
import { JobOffer } from './src/entities/job-offer.entity';
import { ClientSendSettings } from './src/entities/client-send-settings.entity';
import { SendJob } from './src/entities/send-job.entity';
import { EmailSend } from './src/entities/email-send.entity';
import { EmailReputation } from './src/entities/email-reputation.entity';

config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: false,
    logging: true,
    entities: [Client, JobOffer, ClientSendSettings, SendJob, EmailSend, EmailReputation],
    migrations: ['src/migrations/*.ts'],
    ssl: process.env.DATABASE_SSL === 'true',
});
