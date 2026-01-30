import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { GmailReaderService } from './gmail-reader.service';
import { ResponseSyncService } from './response-sync.service';
import { EmailSend } from '../entities/email-send.entity';
import { EmailResponse } from '../entities/email-response.entity';
import { Client } from '../entities/client.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailSend, EmailResponse, Client]),
    forwardRef(() => AiModule),
  ],
  providers: [EmailService, GmailReaderService, ResponseSyncService],
  exports: [EmailService, GmailReaderService, ResponseSyncService],
})
export class EmailModule {}
