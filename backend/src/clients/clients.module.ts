import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { DeletionLog } from './entities/deletion-log.entity';
import { ClientDeletionService } from './client-deletion.service';
import { ClientsController } from './clients.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client, DeletionLog]),
        NotificationsModule,
    ],
    controllers: [ClientsController],
    providers: [ClientDeletionService],
    exports: [ClientDeletionService],
})
export class ClientsModule { }
