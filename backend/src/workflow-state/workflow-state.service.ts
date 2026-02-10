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
import { DriveService } from '../drive/drive.service';

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
  oldFolderId: string | null;
  newFolderId: string | null;
  hasFilesInOldFolder: boolean;
  cvCreatorName: string | null;
  currentWorkflow: WorkflowType;
  allWorkflows: WorkflowState[];
}

export interface WorkflowState {
  workflowType: WorkflowType;
  status: WorkflowStatus;
  executionUrl: string | null;
  executedAt: Date | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
}

// Define the order of workflows for progression logic
export const WORKFLOW_ORDER: WorkflowType[] = [
  WorkflowType.WKF_1,
  WorkflowType.WKF_1_1,
  WorkflowType.WKF_1_2,
  WorkflowType.WKF_1_3,
  WorkflowType.WKF_1_4,
];

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(
    @InjectRepository(ClientWorkflowState)
    private readonly workflowStateRepository: Repository<ClientWorkflowState>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly driveService: DriveService,
  ) { }

  /**
   * Get the complete workflow pipeline for the Kanban board
   * NEW: Shows only ONE card per client in their current/active workflow
   */
  async getWorkflowPipeline(): Promise<PipelineColumn[]> {
    // Get all clients with their workflow states
    const clients = await this.clientRepository.find({
      relations: ['sendSettings', 'cvCreator'],
      order: { id: 'ASC' },
    });

    const allStates = await this.workflowStateRepository.find({
      relations: ['client'],
      order: { clientId: 'ASC' },
    });

    // Group states by client
    const statesByClient = new Map<number, Map<WorkflowType, ClientWorkflowState>>();
    allStates.forEach((state) => {
      if (!statesByClient.has(state.clientId)) {
        statesByClient.set(state.clientId, new Map());
      }
      statesByClient.get(state.clientId)!.set(state.workflowType, state);
    });

    // Define workflow columns + COMPLETED column
    const workflows: Array<{
      type: WorkflowType | 'COMPLETED';
      title: string;
      description: string;
      requiresManualAction: boolean;
    }> = [
        {
          type: WorkflowType.WKF_1,
          title: 'WKF-1',
          description: 'Auto-ejecutado desde Zoho CRM',
          requiresManualAction: false,
        },
        {
          type: WorkflowType.WKF_1_1,
          title: 'WKF-1.1',
          description: 'Revisar carpeta y ejecutar manualmente',
          requiresManualAction: true,
        },
        {
          type: WorkflowType.WKF_1_2,
          title: 'WKF-1.2',
          description: 'Auto-ejecutado cada 5 horas',
          requiresManualAction: false,
        },
        {
          type: WorkflowType.WKF_1_3,
          title: 'WKF-1.3',
          description: 'Revisar carpeta y ejecutar manualmente',
          requiresManualAction: true,
        },
        {
          type: WorkflowType.WKF_1_4,
          title: 'WKF-1.4',
          description: 'Auto-ejecutado tras WKF-1.3',
          requiresManualAction: false,
        },
        {
          type: 'COMPLETED',
          title: 'Workflows Completados',
          description: 'Todos los workflows finalizados',
          requiresManualAction: false,
        },
      ];

    // Initialize columns
    const columnMap = new Map<WorkflowType | 'COMPLETED', ClientWorkflowCard[]>();
    workflows.forEach((wf) => columnMap.set(wf.type, []));

    // Process each client
    for (const client of clients) {
      const clientStates = statesByClient.get(client.id);
      if (!clientStates || clientStates.size === 0) continue;

      // Build roadmap (all workflows for this client)
      const allWorkflows: WorkflowState[] = WORKFLOW_ORDER.map((wfType) => {
        const state = clientStates.get(wfType);
        return {
          workflowType: wfType,
          status: state?.status || WorkflowStatus.PENDING,
          executionUrl: state?.executionUrl || null,
          executedAt: state?.executedAt || null,
          errorMessage: state?.errorMessage || null,
          metadata: state?.metadata || null,
        };
      });

      // Determine if all workflows are complete
      const allComplete = allWorkflows.every((wf) => wf.status === WorkflowStatus.OK);

      // Find current workflow (first non-OK)
      const currentWorkflow = allComplete
        ? null
        : WORKFLOW_ORDER.find((wfType) => {
          const state = clientStates.get(wfType);
          return !state || state.status !== WorkflowStatus.OK;
        });

      // Get the current state data
      const currentState = currentWorkflow ? clientStates.get(currentWorkflow) : null;

      // Check if OLD folder has files (only for manual workflows WKF-1.1 and WKF-1.3)
      let hasFilesInOldFolder = true; // Default to true for non-manual workflows
      if (
        (currentWorkflow === WorkflowType.WKF_1_1 || currentWorkflow === WorkflowType.WKF_1_3) &&
        client.idCarpetaOld
      ) {
        try {
          hasFilesInOldFolder = await this.driveService.hasFilesInFolder(client.idCarpetaOld);
          this.logger.debug(
            `Client ${client.id} OLD folder has files: ${hasFilesInOldFolder}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to check OLD folder for client ${client.id}, assuming has files`,
          );
          hasFilesInOldFolder = true; // Default to true on error to avoid blocking
        }
      }

      // Create card
      const card: ClientWorkflowCard = {
        clientId: client.id,
        clientName: `${client.nombre || ''} ${client.apellido || ''}`.trim(),
        estado: client.estado,
        status: allComplete
          ? WorkflowStatus.OK
          : currentState?.status || WorkflowStatus.PENDING,
        executionUrl: currentState?.executionUrl || null,
        executedAt: currentState?.executedAt || null,
        errorMessage: currentState?.errorMessage || null,
        metadata: currentState?.metadata || null,
        driveFolder: client.idCarpetaCliente,
        oldFolderId: client.idCarpetaOld || null,
        newFolderId: client.idCarpetaNew || null,
        hasFilesInOldFolder,
        cvCreatorName: client.cvCreator?.nombre || null,
        currentWorkflow: currentWorkflow || WorkflowType.WKF_1_4, // If all complete, show last workflow
        allWorkflows,
      };

      // Add to appropriate column
      if (allComplete) {
        columnMap.get('COMPLETED')!.push(card);
      } else if (currentWorkflow) {
        columnMap.get(currentWorkflow)!.push(card);
      }
    }

    // Build final pipeline
    const pipeline: PipelineColumn[] = workflows.map((workflow) => ({
      workflowType: workflow.type as any,
      title: workflow.title,
      description: workflow.description,
      clients: columnMap.get(workflow.type) || [],
      requiresManualAction: workflow.requiresManualAction,
    }));

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

    // Auto-update cvStatus when WKF-1.3 completes successfully
    if (
      updateDto.workflowType === WorkflowType.WKF_1_3 &&
      updateDto.status === WorkflowStatus.OK
    ) {
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
      });
      if (client) {
        client.cvStatus = 'finalizado';
        await this.clientRepository.save(client);
        this.logger.log(
          `Auto-updated cvStatus to 'finalizado' for client ${clientId} (WKF-1.3 OK)`,
        );
      }
    }

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
