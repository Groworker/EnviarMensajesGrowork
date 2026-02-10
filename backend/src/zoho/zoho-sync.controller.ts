import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZohoSyncService } from './zoho-sync.service';

interface SyncResponse {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
}

@Controller('zoho-sync')
export class ZohoSyncController {
  private readonly logger = new Logger(ZohoSyncController.name);

  constructor(private readonly zohoSyncService: ZohoSyncService) { }

  /**
   * Get sync status
   */
  @Get('status')
  getStatus(): { isSyncing: boolean } {
    return {
      isSyncing: this.zohoSyncService.isSyncInProgress(),
    };
  }

  /**
   * Manually trigger delta sync
   * Only syncs contacts modified since last sync
   */
  @Post('delta')
  @HttpCode(HttpStatus.OK)
  async triggerDeltaSync(): Promise<SyncResponse> {
    this.logger.log('Manual delta sync triggered via API');

    const result = await this.zohoSyncService.handleDeltaSync();

    return {
      message: 'Delta sync completed',
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      deleted: result.deleted,
    };
  }

  /**
   * Manually trigger full sync
   * Syncs all contacts from Zoho (use with caution - heavy API usage)
   */
  @Post('full')
  @HttpCode(HttpStatus.OK)
  async triggerFullSync(): Promise<SyncResponse> {
    this.logger.log('Manual full sync triggered via API');

    const result = await this.zohoSyncService.handleFullSync();

    return {
      message: 'Full sync completed',
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      deleted: result.deleted,
    };
  }
}
