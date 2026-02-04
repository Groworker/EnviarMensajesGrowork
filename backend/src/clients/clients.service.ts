import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
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
  DeleteClientDto,
} from './dto';
import { ZohoService } from '../zoho/zoho.service';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service';
import { JobOffer } from '../entities/job-offer.entity';

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
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    private readonly zohoService: ZohoService,
    private readonly googleWorkspaceService: GoogleWorkspaceService,
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
    return this.clientRepository.save(client);
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

    try {
      // 1. Update in database first
      client.estado = nuevoEstado;
      const updatedClient = await this.clientRepository.save(client);

      this.logger.log(
        `Updated client ${id} estado from "${oldEstado}" to "${nuevoEstado}"`,
      );

      // 2. Sync with Zoho CRM
      try {
        await this.zohoService.updateClientEstado(client.zohoId, nuevoEstado);
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

  /**
   * Check if a client is eligible for deletion
   * Returns information about whether client can be deleted and why
   */
  async checkDeletionEligibility(clientId: number): Promise<{
    canDelete: boolean;
    reasons: string[];
    warnings: string[];
    clientInfo: any;
  }> {
    const client = await this.findOne(clientId);

    const reasons: string[] = [];
    const warnings: string[] = [];

    // Get matching job offers to check if there are pending emails
    const matchingOffers = await this.findMatchingOffersForClient(client);

    // Check condition 1: No more matching emails available
    const hasMatchingEmails = matchingOffers.length > 0;

    // Check condition 2: Estado CRM is "Cerrado"
    const isCerrado = client.estado === 'Cerrado';

    // Collect reasons why client CANNOT be deleted automatically
    if (hasMatchingEmails) {
      reasons.push(
        `El cliente aún tiene ${matchingOffers.length} ofertas de trabajo que coinciden con sus preferencias`,
      );
    }

    if (!isCerrado) {
      reasons.push(
        `El estado CRM del cliente es "${client.estado}" (debe ser "Cerrado" para eliminar automáticamente)`,
      );
    }

    // Check if account exists in Google Workspace
    let googleAccountExists = false;
    if (client.emailOperativo) {
      try {
        googleAccountExists = await this.googleWorkspaceService.checkUserExists(
          client.emailOperativo,
        );
        if (!googleAccountExists) {
          warnings.push(
            `La cuenta de Google Workspace ${client.emailOperativo} no existe o ya ha sido eliminada`,
          );
        }
      } catch (error) {
        warnings.push(
          `No se pudo verificar si la cuenta de Google Workspace existe: ${error.message}`,
        );
      }
    } else {
      warnings.push('El cliente no tiene email operativo configurado');
    }

    // Client can be deleted if they meet both conditions OR if forced manually
    const canDelete = !hasMatchingEmails && isCerrado;

    const emailStats = await this.getClientEmailStats(clientId);

    return {
      canDelete,
      reasons,
      warnings,
      clientInfo: {
        id: client.id,
        nombre: `${client.nombre} ${client.apellido}`.trim(),
        email: client.email,
        emailOperativo: client.emailOperativo,
        estado: client.estado,
        googleAccountExists,
        stats: emailStats,
        matchingOffersCount: matchingOffers.length,
      },
    };
  }

  /**
   * Find matching job offers for a client (similar logic to worker.service findCandidates)
   */
  private async findMatchingOffersForClient(client: Client): Promise<JobOffer[]> {
    // Get IDs of already sent offers for this client
    const sentOffers = await this.emailSendRepository
      .createQueryBuilder('s')
      .select('s.job_offer_id')
      .where('s.client_id = :clientId', { clientId: client.id })
      .getRawMany<{ job_offer_id: number }>();

    const sentIds = sentOffers.map((s) => s.job_offer_id);
    const excludeIds = sentIds.length > 0 ? sentIds : [-1];

    // Build Query based on Client Fields
    const qb = this.jobOfferRepository
      .createQueryBuilder('offer')
      .where('offer.id NOT IN (:...excludeIds)', { excludeIds });

    // Normalize Zoho data
    const paisesInteres = Array.isArray(client.paisesInteres?.values)
      ? client.paisesInteres.values
      : typeof client.paisesInteres?.values === 'string'
        ? [client.paisesInteres.values]
        : Array.isArray(client.paisesInteres)
          ? client.paisesInteres
          : [];

    const ciudadesInteres = Array.isArray(client.ciudadesInteres?.values)
      ? client.ciudadesInteres.values
      : typeof client.ciudadesInteres?.values === 'string'
        ? [client.ciudadesInteres.values]
        : Array.isArray(client.ciudadesInteres)
          ? client.ciudadesInteres
          : [];

    // Apply matching criteria
    const criteria = client.sendSettings?.matchingCriteria || {};
    const matchMode = criteria.matchMode || 'all';
    const enabledFilters = criteria.enabledFilters;

    const conditions: string[] = [];
    const parameters: any = {};

    // Helper function to check if a filter is enabled
    const isFilterEnabled = (filterName: string): boolean => {
      if (!enabledFilters || enabledFilters.length === 0) {
        return true;
      }
      return enabledFilters.includes(filterName);
    };

    // Apply filters
    if (isFilterEnabled('countries') && paisesInteres && paisesInteres.length > 0) {
      conditions.push('offer.pais IN (:...countries)');
      parameters.countries = paisesInteres;
    }

    if (isFilterEnabled('cities') && ciudadesInteres && ciudadesInteres.length > 0) {
      conditions.push('offer.ciudad IN (:...cities)');
      parameters.cities = ciudadesInteres;
    }

    if (isFilterEnabled('jobTitle') && client.jobTitle) {
      const jobTitleMode = criteria.jobTitleMatchMode || 'contains';
      if (jobTitleMode === 'exact') {
        conditions.push('LOWER(offer.puesto) = LOWER(:jobTitle)');
        parameters.jobTitle = client.jobTitle;
      } else {
        conditions.push('offer.puesto ILIKE :jobTitle');
        parameters.jobTitle = `%${client.jobTitle}%`;
      }
    }

    // Apply conditions based on matchMode
    if (conditions.length > 0) {
      if (matchMode === 'all') {
        const combinedCondition = conditions.join(' AND ');
        qb.andWhere(`(${combinedCondition})`, parameters);
      } else {
        const combinedCondition = conditions.join(' OR ');
        qb.andWhere(`(${combinedCondition})`, parameters);
      }
    }

    return qb.getMany();
  }

  /**
   * Delete a client and their Google Workspace account
   */
  async deleteClient(
    clientId: number,
    deleteDto: DeleteClientDto,
  ): Promise<{ success: boolean; message: string; deletedClient: any }> {
    // Verify deletion is confirmed
    if (!deleteDto.confirmed) {
      throw new BadRequestException(
        'Deletion must be confirmed by setting confirmed: true',
      );
    }

    const client = await this.findOne(clientId);

    // Check eligibility
    const eligibility = await this.checkDeletionEligibility(clientId);

    // Log deletion attempt
    this.logger.log(
      `Attempting to delete client ${clientId} (${client.nombre} ${client.apellido})`,
    );
    this.logger.log(
      `Can delete automatically: ${eligibility.canDelete}. Reasons: ${eligibility.reasons.join(', ')}`,
    );

    // Try to delete from Google Workspace if email operativo exists
    let googleWorkspaceDeleted = false;
    let googleWorkspaceError: string | null = null;

    if (client.emailOperativo) {
      try {
        await this.googleWorkspaceService.deleteUser(client.emailOperativo);
        googleWorkspaceDeleted = true;
        this.logger.log(
          `Successfully deleted Google Workspace account: ${client.emailOperativo}`,
        );
      } catch (error: any) {
        googleWorkspaceError = error.message;
        this.logger.warn(
          `Failed to delete Google Workspace account ${client.emailOperativo}: ${error.message}`,
        );
        // Continue with soft delete even if Google Workspace deletion fails
      }
    }

    // Perform soft delete (mark as deleted in database)
    client.deletedAt = new Date();
    client.deletionReason = deleteDto.reason || 'No reason provided';

    if (googleWorkspaceError) {
      client.deletionReason += ` | Google Workspace deletion error: ${googleWorkspaceError}`;
    }

    await this.clientRepository.save(client);

    const resultMessage = googleWorkspaceDeleted
      ? `Cliente eliminado correctamente. Cuenta de Google Workspace ${client.emailOperativo} eliminada.`
      : client.emailOperativo && googleWorkspaceError
        ? `Cliente marcado como eliminado en la base de datos, pero falló la eliminación de Google Workspace: ${googleWorkspaceError}`
        : 'Cliente marcado como eliminado en la base de datos (no tenía cuenta de Google Workspace)';

    return {
      success: true,
      message: resultMessage,
      deletedClient: {
        id: client.id,
        nombre: `${client.nombre} ${client.apellido}`.trim(),
        emailOperativo: client.emailOperativo,
        deletedAt: client.deletedAt,
        deletionReason: client.deletionReason,
        googleWorkspaceDeleted,
        googleWorkspaceError,
      },
    };
  }
}
