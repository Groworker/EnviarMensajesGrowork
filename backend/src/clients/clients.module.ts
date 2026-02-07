import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { ClientsController } from './clients.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClientsService } from './clients.service';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { EmailSend } from '../entities/email-send.entity';
import { GlobalSendConfig } from '../entities/global-send-config.entity';
import { EmailModule } from '../email/email.module';
import { DriveModule } from '../drive/drive.module';
import { ZohoModule } from '../zoho/zoho.module';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Client,
            ClientSendSettings,
            JobOffer,
            EmailSend,
            GlobalSendConfig
        ]),
        NotificationsModule,
        EmailModule,
        DriveModule,
        ZohoModule,
        forwardRef(() => WorkflowStateModule),
    ],
    controllers: [ClientsController],
    providers: [ClientsService],
    exports: [ClientsService],
})
export class ClientsModule { }
