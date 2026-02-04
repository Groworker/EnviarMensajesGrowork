import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { N8nController } from './n8n.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Client } from '../entities/client.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client]),
        NotificationsModule,
    ],
    controllers: [N8nController],
})
export class N8nModule { }
