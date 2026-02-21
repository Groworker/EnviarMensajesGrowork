import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateEmailsService } from './corporate-emails.service.js';
import { CorporateEmailsController } from './corporate-emails.controller.js';
import { GoogleWorkspaceModule } from '../google-workspace/google-workspace.module.js';
import { Client } from '../entities/client.entity.js';
import { Dominio } from '../entities/dominio.entity.js';
import { EmailSend } from '../entities/email-send.entity.js';

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
