import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ClientsService, ClientEmailStats } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateSettingsDto,
  UpdateEstadoDto,
} from './dto';
import { Client } from '../entities/client.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { DriveService } from '../drive/drive.service';
import { DriveFile } from '../drive/interfaces/drive-file.interface';

@Controller('clients')
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(
    private readonly clientsService: ClientsService,
    private readonly driveService: DriveService,
  ) { }

  @Get()
  async findAll(): Promise<Client[]> {
    return this.clientsService.findAll();
  }

  /**
   * Get email statistics for a specific client
   */
  @Get(':id/email-stats')
  async getClientEmailStats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClientEmailStats> {
    return this.clientsService.getClientEmailStats(id);
  }

  /**
   * Get files from a client's NEW folder in Google Drive
   */
  @Get(':id/new-folder-files')
  async getNewFolderFiles(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DriveFile[]> {
    const client = await this.clientsService.findOne(id);
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    if (!client.idCarpetaNew) {
      this.logger.warn(`Client ${id} has no NEW folder configured`);
      return [];
    }
    return this.driveService.getAllFilesFromFolder(client.idCarpetaNew);
  }

  /**
   * Get couple (pareja) info for a client by Zoho ID.
   * Used by n8n WKF-1.4 to check if email creation should be skipped.
   */
  @Get('by-zoho/:zohoId/pareja-info')
  async getParejaInfo(
    @Param('zohoId') zohoId: string,
  ): Promise<{ esPareja: boolean; parejaEmailOperativo: string | null; emailAlias: string | null }> {
    return this.clientsService.getParejaInfoByZohoId(zohoId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Client> {
    const client = await this.clientsService.findOne(id);
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClientDto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(createClientDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(id, updateClientDto);
  }

  @Patch(':id/settings')
  async updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() settings: UpdateSettingsDto,
  ): Promise<ClientSendSettings> {
    return this.clientsService.updateSettings(id, settings);
  }

  @Patch(':id/estado')
  @HttpCode(HttpStatus.OK)
  async updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoDto,
  ): Promise<Client> {
    return this.clientsService.updateEstado(id, updateEstadoDto);
  }

  /**
   * Activate all clients (set estado to "Envío Activo")
   */
  @Post('bulk/activate')
  @HttpCode(HttpStatus.OK)
  async activateAll(): Promise<{ updated: number }> {
    return this.clientsService.activateAll();
  }

  /**
   * Deactivate all clients (set estado to "Pausado")
   */
  @Post('bulk/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAll(): Promise<{ updated: number }> {
    return this.clientsService.deactivateAll();
  }

  /**
   * Set preview mode for all clients
   */
  @Post('bulk/preview-mode')
  @HttpCode(HttpStatus.OK)
  async setPreviewModeAll(
    @Body() body: { enabled: boolean },
  ): Promise<{ updated: number }> {
    return this.clientsService.setPreviewModeAll(body.enabled);
  }

  /**
   * Bulk update status for multiple clients
   */
  @Post('bulk/update-status')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(
    @Body() body: { clientIds: number[]; estado: string; motivoCierre?: string },
  ): Promise<{ updated: number }> {
    return this.clientsService.bulkUpdateStatus(
      body.clientIds,
      body.estado,
      body.motivoCierre,
    );
  }
}
