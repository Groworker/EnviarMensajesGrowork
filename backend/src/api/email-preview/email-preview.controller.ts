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
} from '@nestjs/common';
import { EmailPreviewService } from './email-preview.service';
import { UpdateEmailDto } from './dto/update-email.dto';

@Controller('api/email-preview')
export class EmailPreviewController {
  constructor(private readonly emailPreviewService: EmailPreviewService) {}

  /**
   * Get all emails pending review
   * Optional query param: clientId to filter by client
   */
  @Get()
  async getPendingEmails(@Query('clientId') clientId?: string) {
    const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
    return this.emailPreviewService.getPendingEmails(parsedClientId);
  }

  /**
   * Get statistics for pending emails
   */
  @Get('stats')
  async getStats() {
    return this.emailPreviewService.getStats();
  }

  /**
   * Get all emails approved today
   */
  @Get('approved-today')
  async getApprovedTodayEmails() {
    return this.emailPreviewService.getApprovedTodayEmails();
  }

  /**
   * Get a single email by ID with full details
   */
  @Get(':id')
  async getEmailById(@Param('id', ParseIntPipe) id: number) {
    return this.emailPreviewService.getEmailById(id);
  }

  /**
   * Approve an email and send it
   */
  @Post(':id/approve')
  async approveAndSend(@Param('id', ParseIntPipe) id: number) {
    return this.emailPreviewService.approveAndSend(id);
  }

  /**
   * Reject an email
   */
  @Post(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number) {
    return this.emailPreviewService.reject(id);
  }

  /**
   * Regenerate email content using AI
   */
  @Post(':id/regenerate')
  async regenerate(@Param('id', ParseIntPipe) id: number) {
    return this.emailPreviewService.regenerate(id);
  }

  /**
   * Manually update email subject and/or content
   */
  @Patch(':id')
  async updateEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.emailPreviewService.updateEmail(id, dto);
  }

  /**
   * Delete a single pending email
   */
  @Delete(':id')
  async deleteEmail(@Param('id', ParseIntPipe) id: number) {
    await this.emailPreviewService.deleteEmail(id);
    return { success: true, message: `Email ${id} deleted` };
  }

  /**
   * Delete all pending emails (optionally filtered by client)
   */
  @Delete()
  async deleteAllPending(@Query('clientId') clientId?: string) {
    const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
    return this.emailPreviewService.deleteAllPending(parsedClientId);
  }
}
