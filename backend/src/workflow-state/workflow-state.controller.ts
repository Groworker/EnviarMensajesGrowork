import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { WorkflowStateService, PipelineColumn } from './workflow-state.service';
import { N8nService } from '../n8n/n8n.service';
import { WorkflowType } from '../entities/client-workflow-state.entity';

@Controller('workflow-states')
export class WorkflowStateController {
  private readonly logger = new Logger(WorkflowStateController.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly n8nService: N8nService,
  ) {}

  /**
   * Get the complete workflow pipeline for the Kanban board
   */
  @Get('pipeline')
  async getPipeline(): Promise<PipelineColumn[]> {
    return this.workflowStateService.getWorkflowPipeline();
  }

  /**
   * Manually trigger a workflow for a specific client
   */
  @Post(':clientId/:workflowType/execute')
  @HttpCode(HttpStatus.OK)
  async executeWorkflow(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('workflowType') workflowType: string,
    @Body() body?: { metadata?: Record<string, any> },
  ): Promise<{
    success: boolean;
    message: string;
    executionUrl?: string;
    error?: string;
  }> {
    // Validate workflow type
    if (!Object.values(WorkflowType).includes(workflowType as WorkflowType)) {
      throw new BadRequestException(`Invalid workflow type: ${workflowType}`);
    }

    const workflow = workflowType as WorkflowType;

    this.logger.log(
      `Manual workflow execution requested: ${workflow} for client ${clientId}`,
    );

    // Trigger the workflow via n8n
    const result = await this.n8nService.triggerWorkflow(
      workflow,
      clientId,
      body?.metadata,
    );

    if (result.success) {
      return {
        success: true,
        message: `Workflow ${workflow} triggered successfully for client ${clientId}`,
        executionUrl: result.executionUrl,
      };
    } else {
      return {
        success: false,
        message: `Failed to trigger workflow ${workflow} for client ${clientId}`,
        error: result.error,
      };
    }
  }

  /**
   * Get workflow state for a specific client and workflow
   */
  @Get(':clientId/:workflowType')
  async getWorkflowState(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('workflowType') workflowType: string,
  ) {
    // Validate workflow type
    if (!Object.values(WorkflowType).includes(workflowType as WorkflowType)) {
      throw new BadRequestException(`Invalid workflow type: ${workflowType}`);
    }

    const workflow = workflowType as WorkflowType;
    const state = await this.workflowStateService.getWorkflowState(
      clientId,
      workflow,
    );

    if (!state) {
      throw new BadRequestException(
        `Workflow state not found for client ${clientId} and workflow ${workflow}`,
      );
    }

    return state;
  }

  /**
   * Reset a workflow state back to PENDING
   */
  @Post(':clientId/:workflowType/reset')
  @HttpCode(HttpStatus.OK)
  async resetWorkflowState(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('workflowType') workflowType: string,
  ) {
    // Validate workflow type
    if (!Object.values(WorkflowType).includes(workflowType as WorkflowType)) {
      throw new BadRequestException(`Invalid workflow type: ${workflowType}`);
    }

    const workflow = workflowType as WorkflowType;
    const state = await this.workflowStateService.resetWorkflowState(
      clientId,
      workflow,
    );

    this.logger.log(
      `Reset workflow state for client ${clientId}: ${workflow}`,
    );

    return {
      success: true,
      message: `Workflow ${workflow} reset to PENDING for client ${clientId}`,
      state,
    };
  }

  /**
   * Initialize workflow states for a new client
   */
  @Post(':clientId/initialize')
  @HttpCode(HttpStatus.CREATED)
  async initializeClientStates(
    @Param('clientId', ParseIntPipe) clientId: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.workflowStateService.initializeClientStates(clientId);
    return {
      success: true,
      message: `Workflow states initialized for client ${clientId}`,
    };
  }
}
