import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientWorkflowState,
  WorkflowType,
  WorkflowStatus,
} from '../entities/client-workflow-state.entity';
import { Client } from '../entities/client.entity';
import { UpdateWorkflowStateDto } from './dto';

export interface PipelineColumn {
  workflowType: WorkflowType;
  title: string;
  description: string;
  clients: ClientWorkflowCard[];
  requiresManualAction: boolean;
}

export interface ClientWorkflowCard {
  clientId: number;
  clientName: string;
  estado: string;
  status: WorkflowStatus;
  executionUrl: string | null;
  executedAt: Date | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  driveFolder: string | null;
  nextWorkflow: WorkflowType | null;
}

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(
    @InjectRepository(ClientWorkflowState)
    private readonly workflowStateRepository: Repository<ClientWorkflowState>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * Get the complete workflow pipeline for the Kanban board
   */
  async getWorkflowPipeline(): Promise<PipelineColumn[]> {
    // Get all clients with their workflow states
    const clients = await this.clientRepository.find({
      relations: ['sendSettings'],
      order: { id: 'ASC' },
    });

    const allStates = await this.workflowStateRepository.find({
      relations: ['client'],
      order: { clientId: 'ASC' },
    });

    // Group states by workflow type
    const statesByWorkflow = new Map<WorkflowType, ClientWorkflowState[]>();
    allStates.forEach((state) => {
      if (!statesByWorkflow.has(state.workflowType)) {
        statesByWorkflow.set(state.workflowType, []);
      }
      const workflowStates = statesByWorkflow.get(state.workflowType);
      if (workflowStates) {
        workflowStates.push(state);
      }
    });

    // Define workflow columns
    const workflows: Array<{
      type: WorkflowType;
      title: string;
      description: string;
      requiresManualAction: boolean;
      nextWorkflow: WorkflowType | null;
    }> = [
      {
        type: WorkflowType.WKF_1,
        title: 'WKF-1',
        description: 'Auto-ejecutado desde Zoho CRM',
        requiresManualAction: false,
        nextWorkflow: WorkflowType.WKF_1_1,
      },
      {
        type: WorkflowType.WKF_1_1,
        title: 'WKF-1.1',
        description: 'Revisar carpeta y ejecutar manualmente',
        requiresManualAction: true,
        nextWorkflow: WorkflowType.WKF_1_2,
      },
      {
        type: WorkflowType.WKF_1_2,
        title: 'WKF-1.2',
        description: 'Auto-ejecutado cada 5 horas',
        requiresManualAction: false,
        nextWorkflow: WorkflowType.WKF_1_3,
      },
      {
        type: WorkflowType.WKF_1_3,
        title: 'WKF-1.3',
        description: 'Revisar carpeta y ejecutar manualmente',
        requiresManualAction: true,
        nextWorkflow: null,
      },
      {
        type: WorkflowType.WKF_4,
        title: 'WKF-4',
        description: 'Auto-ejecutado desde Zoho CRM',
        requiresManualAction: false,
        nextWorkflow: null,
      },
    ];

    // Build pipeline columns
    const pipeline: PipelineColumn[] = workflows.map((workflow) => {
      const states = statesByWorkflow.get(workflow.type) || [];
      const clientCards: ClientWorkflowCard[] = states.map((state) => {
        const client = state.client;
        return {
          clientId: client.id,
          clientName: `${client.nombre || ''} ${client.apellido || ''}`.trim(),
          estado: client.estado,
          status: state.status,
          executionUrl: state.executionUrl,
          executedAt: state.executedAt,
          errorMessage: state.errorMessage,
          metadata: state.metadata,
          driveFolder: client.idCarpetaCliente,
          nextWorkflow: workflow.nextWorkflow,
        };
      });

      return {
        workflowType: workflow.type,
        title: workflow.title,
        description: workflow.description,
        clients: clientCards,
        requiresManualAction: workflow.requiresManualAction,
      };
    });

    return pipeline;
  }

  /**
   * Update workflow state when n8n sends a webhook
   */
  async updateWorkflowState(
    clientId: number,
    updateDto: UpdateWorkflowStateDto,
  ): Promise<ClientWorkflowState> {
    // Find existing state
    let state = await this.workflowStateRepository.findOne({
      where: {
        clientId,
        workflowType: updateDto.workflowType,
      },
      relations: ['client'],
    });

    if (!state) {
      // Create new state if doesn't exist
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
      });
      if (!client) {
        throw new NotFoundException(`Client with ID ${clientId} not found`);
      }

      state = this.workflowStateRepository.create({
        clientId,
        workflowType: updateDto.workflowType,
        status: updateDto.status,
        client,
      });
    } else {
      // Update existing state
      state.status = updateDto.status;
    }

    // Update execution details
    if (updateDto.status !== WorkflowStatus.PENDING) {
      state.executedAt = new Date();
    }
    if (updateDto.executionUrl) {
      state.executionUrl = updateDto.executionUrl;
    }
    if (updateDto.errorMessage) {
      state.errorMessage = updateDto.errorMessage;
    }
    if (updateDto.metadata) {
      state.metadata = updateDto.metadata;
    }

    const savedState = await this.workflowStateRepository.save(state);

    this.logger.log(
      `Updated workflow state for client ${clientId}: ${updateDto.workflowType} -> ${updateDto.status}`,
    );

    return savedState;
  }

  /**
   * Get workflow state for a specific client and workflow
   */
  async getWorkflowState(
    clientId: number,
    workflowType: WorkflowType,
  ): Promise<ClientWorkflowState | null> {
    return this.workflowStateRepository.findOne({
      where: { clientId, workflowType },
      relations: ['client'],
    });
  }

  /**
   * Initialize workflow states for a new client
   */
  async initializeClientStates(clientId: number): Promise<void> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    const workflows = Object.values(WorkflowType);
    const states = workflows.map((workflowType) =>
      this.workflowStateRepository.create({
        clientId,
        workflowType,
        status: WorkflowStatus.PENDING,
        client,
      }),
    );

    await this.workflowStateRepository.save(states);
    this.logger.log(`Initialized workflow states for client ${clientId}`);
  }

  /**
   * Reset a workflow state back to PENDING
   */
  async resetWorkflowState(
    clientId: number,
    workflowType: WorkflowType,
  ): Promise<ClientWorkflowState> {
    const state = await this.workflowStateRepository.findOne({
      where: { clientId, workflowType },
      relations: ['client'],
    });

    if (!state) {
      throw new NotFoundException(
        `Workflow state not found for client ${clientId} and workflow ${workflowType}`,
      );
    }

    state.status = WorkflowStatus.PENDING;
    state.executionUrl = null as any;
    state.executedAt = null as any;
    state.errorMessage = null as any;
    state.metadata = null as any;

    const savedState = await this.workflowStateRepository.save(state);
    this.logger.log(
      `Reset workflow state for client ${clientId}: ${workflowType}`,
    );

    return savedState;
  }
}
