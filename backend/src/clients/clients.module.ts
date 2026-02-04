import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { DeletionLog } from './entities/deletion-log.entity';
import { ClientDeletionService } from './client-deletion.service';
import { ClientsController } from './clients.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClientsService } from './clients.service';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { EmailSend } from '../entities/email-send.entity';
import { GlobalSendConfig } from '../entities/global-send-config.entity';
import { GmailReaderService } from '../email/gmail-reader.service';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';
import { DriveModule } from '../drive/drive.module';
import { ZohoModule } from '../zoho/zoho.module';
import { GoogleWorkspaceModule } from '../google-workspace/google-workspace.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Client,
            DeletionLog,
            ClientSendSettings,
            JobOffer,
            EmailSend,
            GlobalSendConfig
        ]),
        NotificationsModule,
        EmailModule,
        DriveModule,
        ZohoModule,
        GoogleWorkspaceModule,
    ],
    controllers: [ClientsController],
    providers: [ClientDeletionService, ClientsService],
    exports: [ClientDeletionService, ClientsService],
})
export class ClientsModule { }
