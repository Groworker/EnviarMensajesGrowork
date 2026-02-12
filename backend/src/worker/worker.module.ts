import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerService } from './worker.service';
import { EmailModule } from '../email/email.module';
import { AiModule } from '../ai/ai.module';
import { DriveModule } from '../drive/drive.module';
import { SendJob } from '../entities/send-job.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { EmailSend } from '../entities/email-send.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { EmailReputation } from '../entities/email-reputation.entity';
import { Client } from '../entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SendJob,
      JobOffer,
      EmailSend,
      ClientSendSettings,
      EmailReputation,
      Client,
    ]),
    EmailModule,
    AiModule,
    DriveModule,
  ],
  providers: [WorkerService],
})
export class WorkerModule { }
