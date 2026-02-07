import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { WorkflowType, WorkflowStatus } from '../../entities/client-workflow-state.entity';

export class UpdateWorkflowStateDto {
  @IsEnum(WorkflowType)
  workflowType: WorkflowType;

  @IsEnum(WorkflowStatus)
  status: WorkflowStatus;

  @IsOptional()
  @IsString()
  executionUrl?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
