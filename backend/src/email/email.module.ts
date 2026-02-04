import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { GmailReaderService } from './gmail-reader.service';
import { ResponseSyncService } from './response-sync.service';
import { EmailSend } from '../entities/email-send.entity';
import { EmailResponse } from '../entities/email-response.entity';
import { Client } from '../entities/client.entity';
import { GlobalSendConfig } from '../entities/global-send-config.entity';
import { AiModule } from '../ai/ai.module';
import { DriveModule } from '../drive/drive.module';
import { EmailPreviewController } from './email-preview.controller';
import { EmailResponsesController } from './email-responses.controller';
import { GlobalConfigController } from './global-config.controller';
import { EmailPreviewService } from './email-preview.service';
import { EmailResponsesService } from './email-responses.service';
import { GlobalConfigService } from './global-config.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailSend, EmailResponse, Client, GlobalSendConfig]),
    forwardRef(() => AiModule),
    DriveModule,
  ],
  controllers: [EmailPreviewController, EmailResponsesController, GlobalConfigController],
  providers: [
    EmailService,
    GmailReaderService,
    ResponseSyncService,
    EmailPreviewService,
    EmailResponsesService,
    GlobalConfigService
  ],
  exports: [
    EmailService,
    GmailReaderService,
    ResponseSyncService,
    EmailPreviewService,
    EmailResponsesService,
    GlobalConfigService
  ],
})
export class EmailModule { }
