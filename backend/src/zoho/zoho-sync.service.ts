import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../entities/client.entity';
import { ZohoService, ZohoContact } from './zoho.service';

@Injectable()
export class ZohoSyncService {
  private readonly logger = new Logger(ZohoSyncService.name);
  private isSyncing = false;
  private readonly batchSize: number;
  private readonly syncEnabled: boolean;

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly zohoService: ZohoService,
    private readonly configService: ConfigService,
  ) {
    this.batchSize =
      this.configService.get<number>('ZOHO_SYNC_BATCH_SIZE') || 200;
    this.syncEnabled =
      this.configService.get<string>('ZOHO_SYNC_ENABLED') !== 'false';
  }

  /**
   * Delta sync - runs every minute
   * Fetches only contacts modified since last sync
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleDeltaSync(): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }> {
    if (!this.syncEnabled) {
      this.logger.debug('Zoho sync is disabled. Skipping.');
      return { created: 0, updated: 0, skipped: 0 };
    }

    if (this.isSyncing) {
      this.logger.debug('Zoho sync already in progress. Skipping.');
      return { created: 0, updated: 0, skipped: 0 };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting Zoho CRM delta sync...');

      // Find the most recent zohoModifiedTime across all clients
      const lastSyncResult = await this.clientRepository
        .createQueryBuilder('client')
        .select('MAX(client.zohoModifiedTime)', 'lastModified')
        .getRawOne();

      // Default to 24 hours ago if no previous sync
      const lastModified = lastSyncResult?.lastModified
        ? new Date(lastSyncResult.lastModified)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      this.logger.log(
        `Fetching contacts modified since: ${lastModified.toISOString()}`,
      );

      let page = 1;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.zohoService.searchModifiedContacts(
          lastModified,
          page,
          this.batchSize,
        );

        if (!response.data || response.data.length === 0) {
          if (page === 1) {
            this.logger.log('No modified contacts found.');
          }
          break;
        }

        for (const zohoContact of response.data) {
          const result = await this.syncContact(zohoContact);
          if (result === 'created') totalCreated++;
          else if (result === 'updated') totalUpdated++;
          else totalSkipped++;
        }

        hasMore = response.info?.more_records || false;
        page++;

        // Rate limiting: pause between pages to stay under 100 req/min
        if (hasMore) {
          await this.delay(600);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Zoho delta sync completed in ${duration}ms. Created: ${totalCreated}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`,
      );

      return {
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
      };
    } catch (error: any) {
      this.logger.error('Zoho delta sync failed', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Full sync - fetches all contacts from Zoho
   * Use for initial setup or recovery
   */
  async handleFullSync(): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting full Zoho CRM sync...');

      let page = 1;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.zohoService.getAllContacts(
          page,
          this.batchSize,
        );

        if (!response.data || response.data.length === 0) {
          if (page === 1) {
            this.logger.log('No contacts found in Zoho.');
          }
          break;
        }

        this.logger.log(
          `Processing page ${page} with ${response.data.length} contacts...`,
        );

        for (const zohoContact of response.data) {
          const result = await this.syncContact(zohoContact);
          if (result === 'created') totalCreated++;
          else if (result === 'updated') totalUpdated++;
          else totalSkipped++;
        }

        hasMore = response.info?.more_records || false;
        page++;

        // Rate limiting
        if (hasMore) {
          await this.delay(600);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Full sync completed in ${duration}ms. Created: ${totalCreated}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`,
      );

      return {
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
      };
    } catch (error: any) {
      this.logger.error('Full sync failed', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single contact from Zoho to local database
   */
  private async syncContact(
    zohoContact: ZohoContact,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const zohoId = zohoContact.id;
    const zohoModifiedTime = new Date(zohoContact.Modified_Time);

    try {
      // Check if client exists
      let client = await this.clientRepository.findOne({
        where: { zohoId },
      });

      if (client) {
        // Skip if local data is newer or same
        if (
          client.zohoModifiedTime &&
          client.zohoModifiedTime >= zohoModifiedTime
        ) {
          return 'skipped';
        }

        // Update existing client
        this.mapZohoToClient(zohoContact, client);
        await this.clientRepository.save(client);
        this.logger.debug(`Updated client ${client.id} (Zoho ID: ${zohoId})`);
        return 'updated';
      } else {
        // Create new client
        client = this.clientRepository.create();
        client.zohoId = zohoId;
        this.mapZohoToClient(zohoContact, client);
        await this.clientRepository.save(client);
        this.logger.log(`Created new client from Zoho (Zoho ID: ${zohoId})`);
        return 'created';
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to sync contact ${zohoId}: ${error.message}`,
      );
      return 'skipped';
    }
  }

  /**
   * Map Zoho contact fields to Client entity
   */
  private mapZohoToClient(zoho: ZohoContact, client: Client): void {
    client.zohoModifiedTime = new Date(zoho.Modified_Time);

    // Only update fields if they have values (avoid overwriting with undefined)
    if (zoho.First_Name !== undefined) {
      client.nombre = zoho.First_Name as string;
    }
    if (zoho.Last_Name !== undefined) {
      client.apellido = zoho.Last_Name as string;
    }
    if (zoho.Email !== undefined) {
      client.email = zoho.Email as string;
    }
    if (zoho.Phone !== undefined) {
      client.phone = zoho.Phone as string;
    }
    if (zoho.Estado_del_cliente !== undefined) {
      client.estado = zoho.Estado_del_cliente as string;
    }
    if (zoho.Email_operativo !== undefined) {
      client.emailOperativo = zoho.Email_operativo as string;
    }
    if (zoho.Industria !== undefined) {
      client.industria = zoho.Industria as string;
    }
    if (zoho.Puesto_objetivo !== undefined) {
      client.jobTitle = zoho.Puesto_objetivo as string;
    }

    // Handle multi-select fields
    // Zoho can return array directly or as { values: [...] }
    client.paisesInteres = this.normalizeMultiSelect(zoho.Pa_ses_de_inter_s);
    client.ciudadesInteres = this.normalizeMultiSelect(zoho.Ciudad_objetivo);

    // Google Drive folder IDs
    if (zoho.id_CARPETA_CLIENTE !== undefined) {
      client.idCarpetaCliente = zoho.id_CARPETA_CLIENTE as string;
    }
    if (zoho.id_CARPETA_DEFINITIVA !== undefined) {
      client.idCarpetaDefinitiva = zoho.id_CARPETA_DEFINITIVA as string;
    }
    if (zoho.id_CARPETA_NEW !== undefined) {
      client.idCarpetaNew = zoho.id_CARPETA_NEW as string;
    }
    if (zoho.id_CARPETA_OLD !== undefined) {
      client.idCarpetaOld = zoho.id_CARPETA_OLD as string;
    }
  }

  /**
   * Normalize Zoho multi-select field to string array
   * Handles both array format and { values: [...] } format
   */
  private normalizeMultiSelect(
    value: string[] | { values: string[] } | null | undefined,
  ): string[] | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      return value.length > 0 ? value : null;
    }

    if (typeof value === 'object' && 'values' in value && Array.isArray(value.values)) {
      return value.values.length > 0 ? value.values : null;
    }

    return null;
  }

  /**
   * Utility method for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if sync is currently running
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}
