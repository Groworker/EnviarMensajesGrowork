import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateSettingsDto,
  UpdateEstadoDto,
} from './dto';
import { ZohoService } from '../zoho/zoho.service';
import { WorkflowStateService } from '../workflow-state/workflow-state.service';

export interface ClientEmailStats {
  clientId: number;
  clientName: string;
  totalEmails: number;
  sent: number;
  failed: number;
  bounced: number;
  pendingReview: number;
  rejected: number;
  reserved: number;
  successRate: number;
  lastEmailAt: Date | null;
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientSendSettings)
    private readonly settingsRepository: Repository<ClientSendSettings>,
    @InjectRepository(EmailSend)
    private readonly emailSendRepository: Repository<EmailSend>,
    private readonly zohoService: ZohoService,
    private readonly workflowStateService: WorkflowStateService,
  ) { }

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find({
      relations: ['sendSettings'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['sendSettings'],
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Check if client with same zohoId already exists
    const existingClient = await this.clientRepository.findOne({
      where: { zohoId: createClientDto.zohoId },
    });

    if (existingClient) {
      throw new NotFoundException(
        `Client with Zoho ID ${createClientDto.zohoId} already exists`,
      );
    }

    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);

    // Initialize workflow states for the new client
    try {
      await this.workflowStateService.initializeClientStates(savedClient.id);
      this.logger.log(
        `Initialized workflow states for new client ${savedClient.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize workflow states for client ${savedClient.id}: ${error.message}`,
      );
      // Don't fail the client creation if workflow state initialization fails
    }

    return savedClient;
  }

  async update(
    id: number,
    updateClientDto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, updateClientDto);
    return this.clientRepository.save(client);
  }

  async updateSettings(
    id: number,
    settingsDto: UpdateSettingsDto,
  ): Promise<ClientSendSettings> {
    const client = await this.findOne(id);
    let settings = client.sendSettings;

    if (!settings) {
      settings = this.settingsRepository.create({
        clientId: client.id,
        client: client,
      });
    }

    // Validate constraints
    if (
      settingsDto.currentDailyLimit &&
      settingsDto.targetDailyLimit &&
      settingsDto.currentDailyLimit > settingsDto.targetDailyLimit
    ) {
      throw new NotFoundException(
        'Current daily limit cannot exceed target daily limit',
      );
    }

    if (
      settingsDto.targetDailyLimit &&
      settingsDto.maxDailyEmails &&
      settingsDto.targetDailyLimit > settingsDto.maxDailyEmails
    ) {
      throw new NotFoundException(
        'Target daily limit cannot exceed max daily emails',
      );
    }

    Object.assign(settings, settingsDto);
    return this.settingsRepository.save(settings);
  }

  /**
   * Activate all clients for email sending (set sendSettings.active to true)
   */
  async activateAll(): Promise<{ updated: number }> {
    const result = await this.settingsRepository
      .createQueryBuilder()
      .update()
      .set({ active: true })
      .execute();
    this.logger.log(`Activated email sending for ${result.affected} clients`);
    return { updated: result.affected || 0 };
  }

  /**
   * Deactivate all clients for email sending (set sendSettings.active to false)
   */
  async deactivateAll(): Promise<{ updated: number }> {
    const result = await this.settingsRepository
      .createQueryBuilder()
      .update()
      .set({ active: false })
      .execute();
    this.logger.log(`Deactivated email sending for ${result.affected} clients`);
    return { updated: result.affected || 0 };
  }

  /**
   * Set preview mode for all clients
   */
  async setPreviewModeAll(
    enabled: boolean,
  ): Promise<{ updated: number }> {
    const result = await this.settingsRepository
      .createQueryBuilder()
      .update()
      .set({ previewEnabled: enabled })
      .execute();
    this.logger.log(
      `Set preview mode to ${enabled} for ${result.affected} clients`,
    );
    return { updated: result.affected || 0 };
  }

  /**
   * Update client estado (status) and sync with Zoho CRM
   */
  async updateEstado(
    id: number,
    updateEstadoDto: UpdateEstadoDto,
  ): Promise<Client> {
    const client = await this.findOne(id);

    // Store old estado for logging
    const oldEstado = client.estado;
    const nuevoEstado = updateEstadoDto.estado;

    // Validate: motivoCierre is required when estado = 'Closed'
    if (nuevoEstado === 'Closed' && !updateEstadoDto.motivoCierre) {
      throw new BadRequestException(
        'El motivo de cierre es obligatorio cuando el estado es "Closed"',
      );
    }

    try {
      // 1. Update in database first
      client.estado = nuevoEstado;
      client.motivoCierre = nuevoEstado === 'Closed' ? updateEstadoDto.motivoCierre : null;
      const updatedClient = await this.clientRepository.save(client);

      this.logger.log(
        `Updated client ${id} estado from "${oldEstado}" to "${nuevoEstado}"${client.motivoCierre ? ` (motivo: ${client.motivoCierre})` : ''}`,
      );

      // 2. Sync with Zoho CRM
      try {
        await this.zohoService.updateClientEstado(client.zohoId, nuevoEstado, client.motivoCierre);
        this.logger.log(
          `Successfully synced estado to Zoho CRM for client ${id} (Zoho ID: ${client.zohoId})`,
        );
      } catch (zohoError: any) {
        // Log warning but don't fail the request
        // The database is already updated, we don't want to rollback
        this.logger.warn(
          `Failed to sync estado to Zoho CRM for client ${id}: ${zohoError.message}`,
        );
        this.logger.warn(
          'Database was updated successfully, but Zoho sync failed. Manual sync may be required.',
        );
      }

      return updatedClient;
    } catch (error: any) {
      this.logger.error(
        `Failed to update estado for client ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get email statistics for a specific client
   */
  async getClientEmailStats(clientId: number): Promise<ClientEmailStats> {
    const client = await this.findOne(clientId);

    // Get counts by status using a single query with GROUP BY
    const statusCounts = await this.emailSendRepository
      .createQueryBuilder('email')
      .select('email.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('email.clientId = :clientId', { clientId })
      .groupBy('email.status')
      .getRawMany();

    // Get last email date
    const lastEmail = await this.emailSendRepository
      .createQueryBuilder('email')
      .select('MAX(email.sentAt)', 'lastAt')
      .where('email.clientId = :clientId', { clientId })
      .getRawOne();

    // Convert to object for easy access
    const counts: Record<string, number> = {};
    statusCounts.forEach((row) => {
      counts[row.status] = parseInt(row.count, 10);
    });

    const sent = counts[EmailSendStatus.SENT] || 0;
    const failed = counts[EmailSendStatus.FAILED] || 0;
    const bounced = counts[EmailSendStatus.BOUNCED] || 0;
    const pendingReview = counts[EmailSendStatus.PENDING_REVIEW] || 0;
    const rejected = counts[EmailSendStatus.REJECTED] || 0;
    const reserved = counts[EmailSendStatus.RESERVED] || 0;
    const approved = counts[EmailSendStatus.APPROVED] || 0;

    const totalEmails = sent + failed + bounced + pendingReview + rejected + reserved + approved;

    // Success rate only counts completed emails (not pending or reserved)
    const completedEmails = sent + failed + bounced + rejected;
    const successRate = completedEmails > 0 ? Math.round((sent / completedEmails) * 100) : 0;

    return {
      clientId,
      clientName: `${client.nombre || ''} ${client.apellido || ''}`.trim(),
      totalEmails,
      sent,
      failed,
      bounced,
      pendingReview,
      rejected,
      reserved,
      successRate,
      lastEmailAt: lastEmail?.lastAt || null,
    };
  }
}
