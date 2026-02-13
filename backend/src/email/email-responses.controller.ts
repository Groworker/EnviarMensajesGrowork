import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  EmailResponsesService,
  ResponseFilters,
} from './email-responses.service';
import { ResponseClassification } from '../entities/email-response.entity';
import { ResponseSyncService } from './response-sync.service';
import { SendReplyDto } from './dto/send-reply.dto';

@Controller('email-responses')
export class EmailResponsesController {
  private readonly logger = new Logger(EmailResponsesController.name);

  constructor(
    private readonly responsesService: EmailResponsesService,
    private readonly responseSyncService: ResponseSyncService,
  ) { }

  /**
   * Get all responses with optional filters
   * Query params: clientId, classification, isRead, limit, offset
   */
  @Get()
  async findAll(
    @Query('clientId') clientId?: string,
    @Query('classification') classification?: ResponseClassification,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: ResponseFilters = {};

    if (clientId) filters.clientId = parseInt(clientId, 10);
    if (classification) filters.classification = classification;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    return this.responsesService.findAll(filters);
  }

  /**
   * Get response statistics
   */
  @Get('stats')
  async getStats(@Query('clientId') clientId?: string) {
    const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
    return this.responsesService.getStats(parsedClientId);
  }

  /**
   * Get responses for a specific client
   */
  @Get('client/:clientId')
  async findByClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.responsesService.findByClient(clientId);
  }

  /**
   * Get responses for a client and their partner (couple)
   */
  @Get('couple/:clientId')
  async findByCouple(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.responsesService.findByCouple(clientId);
  }

  /**
   * Get a single response by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.findOne(id);
  }

  /**
   * Get the full conversation thread for a response
   */
  @Get(':id/thread')
  async getThread(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.getThread(id);
  }

  /**
   * Trigger manual sync for all clients
   */
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync() {
    return this.responsesService.triggerSync();
  }

  /**
   * Trigger sync for a specific client
   */
  @Post('sync/:clientId')
  @HttpCode(HttpStatus.OK)
  async triggerSyncForClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.responsesService.triggerSyncForClient(clientId);
  }

  /**
   * Direct trigger for sync all (for testing/debugging)
   * This calls the ResponseSyncService directly
   */
  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  async triggerSyncAll() {
    this.logger.log('Manual sync-all triggered via API');
    try {
      await this.responseSyncService.syncAllResponses();
      return {
        success: true,
        message: 'Sync completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Sync failed:', error);
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Re-classify a response using AI
   */
  @Post(':id/reclassify')
  async reclassify(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.reclassify(id);
  }

  /**
   * Generate an AI-powered reply suggestion for a response
   */
  @Post(':id/suggest-reply')
  async suggestReply(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.generateReplySuggestion(id);
  }

  /**
   * Send a reply to an email response
   */
  @Post(':id/send-reply')
  @HttpCode(HttpStatus.OK)
  async sendReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendReplyDto,
  ) {
    return this.responsesService.sendReply(id, body.subject, body.htmlContent);
  }

  /**
   * Mark a response as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.markAsRead(id);
  }

  /**
   * Mark a response as unread
   */
  @Patch(':id/unread')
  async markAsUnread(@Param('id', ParseIntPipe) id: number) {
    return this.responsesService.markAsUnread(id);
  }

  /**
   * Mark all responses as read
   */
  @Patch('mark-all-read')
  async markAllAsRead(@Query('clientId') clientId?: string) {
    const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
    return this.responsesService.markAllAsRead(parsedClientId);
  }

  /**
   * Manually override the classification
   */
  @Patch(':id/classification')
  async updateClassification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { classification: ResponseClassification },
  ) {
    return this.responsesService.updateClassification(id, body.classification);
  }

  /**
   * Delete a response
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.responsesService.delete(id);
  }
}
