import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowStateService } from './workflow-state.service';
import { WorkflowStateController } from './workflow-state.controller';
import { ClientWorkflowState } from '../entities/client-workflow-state.entity';
import { Client } from '../entities/client.entity';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientWorkflowState, Client]),
    forwardRef(() => N8nModule),
  ],
  controllers: [WorkflowStateController],
  providers: [WorkflowStateService],
  exports: [WorkflowStateService],
})
export class WorkflowStateModule {}
