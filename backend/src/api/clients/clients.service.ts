import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { ClientSendSettings } from '../../entities/client-send-settings.entity';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateSettingsDto,
  UpdateEstadoDto,
} from './dto';
import { ZohoService } from '../../zoho/zoho.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientSendSettings)
    private readonly settingsRepository: Repository<ClientSendSettings>,
    private readonly zohoService: ZohoService,
  ) {}

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
}
