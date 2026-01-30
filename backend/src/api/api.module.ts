import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { Client } from '../entities/client.entity';
import { SendJob } from '../entities/send-job.entity';
import { EmailSend } from '../entities/email-send.entity';
import { ClientsModule } from './clients/clients.module';
import { JobOffersModule } from './job-offers/job-offers.module';
import { EmailPreviewModule } from './email-preview/email-preview.module';
import { EmailResponsesModule } from './email-responses/email-responses.module';
import { GlobalConfigModule } from './global-config/global-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, SendJob, EmailSend]),
    ClientsModule,
    JobOffersModule,
    EmailPreviewModule,
    EmailResponsesModule,
    GlobalConfigModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class ApiModule { }
