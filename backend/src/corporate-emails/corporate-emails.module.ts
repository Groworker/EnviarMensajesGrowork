import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateEmailsService } from './corporate-emails.service';
import { CorporateEmailsController } from './corporate-emails.controller';
import { GoogleWorkspaceModule } from '../google-workspace/google-workspace.module';
import { Client } from '../entities/client.entity';
import { Dominio } from '../entities/dominio.entity';
import { EmailSend } from '../entities/email-send.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client, Dominio, EmailSend]),
        GoogleWorkspaceModule,
    ],
    controllers: [CorporateEmailsController],
    providers: [CorporateEmailsService],
    exports: [CorporateEmailsService],
})
export class CorporateEmailsModule { }
