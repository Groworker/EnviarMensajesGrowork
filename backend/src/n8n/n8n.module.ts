import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { N8nController } from './n8n.controller';
import { N8nService } from './n8n.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { Client } from '../entities/client.entity';
import { WorkflowStateModule } from '../workflow-state/workflow-state.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client]),
        ConfigModule,
        NotificationsModule,
        forwardRef(() => WorkflowStateModule),
    ],
    controllers: [N8nController],
    providers: [N8nService],
    exports: [N8nService],
})
export class N8nModule { }
