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
import { EmailPreviewController } from './email-preview.controller';
import { EmailResponsesController } from './email-responses.controller';
import { GlobalConfigController } from './global-config.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailSend, EmailResponse, Client, GlobalSendConfig]),
    forwardRef(() => AiModule),
  ],
  controllers: [EmailPreviewController, EmailResponsesController, GlobalConfigController],
  providers: [EmailService, GmailReaderService, ResponseSyncService],
  exports: [EmailService, GmailReaderService, ResponseSyncService],
})
export class EmailModule { }
