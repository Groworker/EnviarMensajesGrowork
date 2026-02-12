import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WorkflowType } from '../entities/client-workflow-state.entity';
import { Client } from '../entities/client.entity';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly n8nBaseUrl: string;
  private readonly n8nApiKey: string;

  // Map workflow types to n8n webhook URLs
  // Only workflows that can be triggered manually from the UI need URLs
  private readonly workflowWebhooks: Record<WorkflowType, string> = {
    [WorkflowType.WKF_1]: '', // Auto-triggered from Zoho CRM, no manual trigger needed
    [WorkflowType.WKF_1_1]: process.env.N8N_WKF1_1_WEBHOOK_URL || '', // Manual trigger from UI
    [WorkflowType.WKF_1_2]: '', // Auto-triggered every 5 hours, no manual trigger needed
    [WorkflowType.WKF_1_3]: process.env.N8N_WKF1_3_WEBHOOK_URL || '', // Manual trigger from UI
    [WorkflowType.WKF_1_4]: '', // Auto-triggered after WKF-1.3, no manual trigger needed
  };

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {
    this.n8nBaseUrl = this.configService.get<string>('N8N_BASE_URL', '');
    this.n8nApiKey = this.configService.get<string>('N8N_API_KEY', '');
  }

  /**
   * Trigger a specific workflow for a client
   */
  async triggerWorkflow(
    workflowType: WorkflowType,
    clientId: number,
    additionalData?: Record<string, any>,
  ): Promise<{ success: boolean; executionUrl?: string; error?: string }> {
    const webhookUrl = this.workflowWebhooks[workflowType];

    if (!webhookUrl) {
      const error = `No webhook URL configured for workflow ${workflowType}`;
      this.logger.error(error);
      return { success: false, error };
    }

    try {
      this.logger.log(
        `Triggering workflow ${workflowType} for client ${clientId}`,
      );

      // Fetch client details from database to include in payload
      const client = await this.clientRepository.findOne({ where: { id: clientId } });

      // Check if client has a pareja and include couple info in payload
      let parejaPayload: Record<string, any> = {};
      if (client?.parejaId) {
        const pareja = await this.clientRepository.findOne({
          where: { id: client.parejaId },
        });
        if (pareja) {
          parejaPayload = {
            esPareja: true,
            parejaInfo: {
              nombre: pareja.nombre,
              apellido: pareja.apellido,
              emailOperativo: pareja.emailOperativo || null,
            },
            emailAlias: generateCoupleAlias(
              client.id < pareja.id ? client.nombre : pareja.nombre,
              client.id < pareja.id ? pareja.nombre : client.nombre,
            ),
          };
        }
      }

      const payload = {
        clientId,
        zohoId: client?.zohoId || undefined,
        cliente: client ? `${client.nombre || ''} ${client.apellido || ''}`.trim() : undefined,
        id_contacto: client?.zohoId || undefined, // Alias for n8n compatibility
        idioma_cv: client?.idiomaCV || undefined, // Language of CV for creator assignment
        mailCorporativo: client?.emailOperativo || '',
        workflowType,
        timestamp: new Date().toISOString(),
        ...parejaPayload,
        ...additionalData,
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.n8nApiKey && { 'X-N8N-API-KEY': this.n8nApiKey }),
        },
        timeout: 30000, // 30 second timeout
      });

      this.logger.log(
        `Successfully triggered workflow ${workflowType} for client ${clientId}`,
      );

      // Extract execution URL from response if available
      const executionUrl = response.data?.executionUrl || null;

      return {
        success: true,
        executionUrl,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      this.logger.error(
        `Failed to trigger workflow ${workflowType} for client ${clientId}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if a workflow webhook is configured
   */
  isWorkflowConfigured(workflowType: WorkflowType): boolean {
    return !!this.workflowWebhooks[workflowType];
  }

  /**
   * Get all configured workflows
   */
  getConfiguredWorkflows(): WorkflowType[] {
    return Object.entries(this.workflowWebhooks)
      .filter(([_, url]) => !!url)
      .map(([type, _]) => type as WorkflowType);
  }
}

/**
 * Generate a combined email alias for a couple.
 * Takes first 4 chars of each name, lowercased, without accents.
 * Example: "Luis" + "Patricia" -> "luispatr"
 */
export function generateCoupleAlias(name1: string, name2: string): string {
  const normalize = (name: string): string =>
    (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '')
      .substring(0, 4);
  return `${normalize(name1)}${normalize(name2)}`;
}
