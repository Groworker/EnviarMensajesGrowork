import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Client } from './entities/client.entity';
import { JobOffer } from './entities/job-offer.entity';
import { ClientSendSettings } from './entities/client-send-settings.entity';
import { SendJob } from './entities/send-job.entity';
import { EmailSend } from './entities/email-send.entity';
import { EmailReputation } from './entities/email-reputation.entity';
import { EmailResponse } from './entities/email-response.entity';
import { GlobalSendConfig } from './entities/global-send-config.entity';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WorkerModule } from './worker/worker.module';
import { EmailModule } from './email/email.module';
import { ZohoModule } from './zoho/zoho.module';
import { AiModule } from './ai/ai.module';
import { DriveModule } from './drive/drive.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { N8nModule } from './n8n/n8n.module';
import { WorkflowStateModule } from './workflow-state/workflow-state.module';
import { Notification } from './notifications/entities/notification.entity';
import { ClientWorkflowState } from './entities/client-workflow-state.entity';
import { CvCreator } from './entities/cv-creator.entity';
import { CvCreatorsModule } from './cv-creators/cv-creators.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [
          Client,
          JobOffer,
          ClientSendSettings,
          SendJob,
          EmailSend,
          EmailReputation,
          EmailResponse,
          GlobalSendConfig,
          Notification,
          ClientWorkflowState,
          CvCreator,
        ],
        synchronize: false, // We will use migrations
        ssl: configService.get<string>('DATABASE_SSL') === 'true',
      }),
    }),
    SchedulerModule,
    WorkerModule,
    EmailModule,
    ZohoModule,
    AiModule,
    DriveModule,
    NotificationsModule,
    ClientsModule,
    DashboardModule,
    N8nModule,
    WorkflowStateModule,
    CvCreatorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
