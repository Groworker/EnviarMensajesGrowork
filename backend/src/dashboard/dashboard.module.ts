import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Client } from '../entities/client.entity';
import { EmailSend } from '../entities/email-send.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { DeletionLog } from '../clients/entities/deletion-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client, EmailSend, Notification, DeletionLog]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }
