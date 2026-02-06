import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmailResponse,
  ResponseClassification,
} from '../entities/email-response.entity';
import { EmailSend } from '../entities/email-send.entity';
import { ResponseSyncService } from './response-sync.service';
import { AiService } from '../ai/ai.service';
import { EmailService } from './email.service';
import { ReplyGeneratorContext } from '../ai/prompts/reply-generator.prompt';

export interface ResponseFilters {
  clientId?: number;
  classification?: ResponseClassification;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface ResponseStats {
  total: number;
  unread: number;
  byClassification: Record<ResponseClassification, number>;
}

@Injectable()
export class EmailResponsesService {
  private readonly logger = new Logger(EmailResponsesService.name);

  constructor(
    @InjectRepository(EmailResponse)
    private responseRepository: Repository<EmailResponse>,
    @InjectRepository(EmailSend)
    private emailSendRepository: Repository<EmailSend>,
    private responseSyncService: ResponseSyncService,
    private aiService: AiService,
    private emailService: EmailService,
  ) { }

  /**
   * Get all responses with optional filters
   */
  async findAll(filters: ResponseFilters = {}): Promise<EmailResponse[]> {
    const qb = this.responseRepository
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.emailSend', 'emailSend')
      .leftJoinAndSelect('emailSend.client', 'client')
      .leftJoinAndSelect('emailSend.jobOffer', 'jobOffer');

    if (filters.clientId) {
      qb.andWhere('emailSend.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }

    if (filters.classification) {
      qb.andWhere('response.classification = :classification', {
        classification: filters.classification,
      });
    }

    if (filters.isRead !== undefined) {
      qb.andWhere('response.isRead = :isRead', { isRead: filters.isRead });
    }

    qb.orderBy('response.receivedAt', 'DESC');

    if (filters.limit) {
      qb.take(filters.limit);
    }

    if (filters.offset) {
      qb.skip(filters.offset);
    }

    return qb.getMany();
  }

  /**
   * Get responses for a specific client
   */
  async findByClient(clientId: number): Promise<EmailResponse[]> {
    return this.findAll({ clientId });
  }

  /**
   * Get a single response by ID
   */
  async findOne(id: number): Promise<EmailResponse> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['emailSend', 'emailSend.client', 'emailSend.jobOffer'],
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${id} not found`);
    }

    return response;
  }

  /**
   * Get statistics for responses
   */
  async getStats(clientId?: number): Promise<ResponseStats> {
    const qb = this.responseRepository.createQueryBuilder('response');

    if (clientId) {
      qb.leftJoin('response.emailSend', 'emailSend').andWhere(
        'emailSend.clientId = :clientId',
        { clientId },
      );
    }

    // Total count
    const total = await qb.getCount();

    // Unread count
    const unreadQb = this.responseRepository.createQueryBuilder('response');
    if (clientId) {
      unreadQb
        .leftJoin('response.emailSend', 'emailSend')
        .andWhere('emailSend.clientId = :clientId', { clientId });
    }
    unreadQb.andWhere('response.isRead = false');
    const unread = await unreadQb.getCount();

    // Count by classification
    const classificationCounts = await this.responseRepository
      .createQueryBuilder('response')
      .select('response.classification', 'classification')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('response.emailSend', 'emailSend')
      .where(clientId ? 'emailSend.clientId = :clientId' : '1=1', { clientId })
      .groupBy('response.classification')
      .getRawMany();

    const byClassification: Record<ResponseClassification, number> = {
      [ResponseClassification.NEGATIVA]: 0,
      [ResponseClassification.AUTOMATICA]: 0,
      [ResponseClassification.ENTREVISTA]: 0,
      [ResponseClassification.MAS_INFORMACION]: 0,
      [ResponseClassification.CONTRATADO]: 0,
      [ResponseClassification.SIN_CLASIFICAR]: 0,
    };

    classificationCounts.forEach((row) => {
      byClassification[row.classification as ResponseClassification] = parseInt(
        row.count,
        10,
      );
    });

    return { total, unread, byClassification };
  }

  /**
   * Mark a response as read
   */
  async markAsRead(id: number): Promise<EmailResponse> {
    const response = await this.findOne(id);
    response.isRead = true;
    return this.responseRepository.save(response);
  }

  /**
   * Mark a response as unread
   */
  async markAsUnread(id: number): Promise<EmailResponse> {
    const response = await this.findOne(id);
    response.isRead = false;
    return this.responseRepository.save(response);
  }

  /**
   * Mark all responses as read (optionally filtered by client)
   */
  async markAllAsRead(clientId?: number): Promise<{ updated: number }> {
    const qb = this.responseRepository
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('isRead = false');

    if (clientId) {
      qb.andWhere(
        'email_send_id IN (SELECT id FROM email_sends WHERE client_id = :clientId)',
        { clientId },
      );
    }

    const result = await qb.execute();
    return { updated: result.affected || 0 };
  }

  /**
   * Manually override the classification
   */
  async updateClassification(
    id: number,
    classification: ResponseClassification,
  ): Promise<EmailResponse> {
    const response = await this.findOne(id);

    response.classification = classification;
    response.classificationConfidence = 1.0; // Manual = 100% confidence
    response.classificationReasoning = 'Clasificación manual por usuario';
    response.classifiedAt = new Date();

    return this.responseRepository.save(response);
  }

  /**
   * Re-classify a response using AI
   */
  async reclassify(id: number): Promise<EmailResponse> {
    const response = await this.findOne(id);

    const bodyText =
      response.bodyText || this.stripHtml(response.bodyHtml || '');

    if (!bodyText || bodyText.length < 10) {
      throw new BadRequestException('Response body too short to classify');
    }

    const result = await this.aiService.classifyResponse(
      response.subject,
      bodyText,
      response.emailSend?.subjectSnapshot || undefined,
      response.emailSend?.recipientEmail,
    );

    response.classification = result.classification;
    response.classificationConfidence = result.confidence;
    response.classificationReasoning = result.reasoning;
    response.classifiedAt = new Date();

    const saved = await this.responseRepository.save(response);

    this.logger.log(
      `Response ${id} reclassified as "${result.classification}" (${Math.round(result.confidence * 100)}%)`,
    );

    return saved;
  }

  /**
   * Trigger manual sync for all responses
   */
  async triggerSync(): Promise<{ message: string }> {
    // Run sync in background
    this.responseSyncService.syncAllResponses().catch((err) => {
      this.logger.error(`Sync failed: ${err.message}`);
    });

    return { message: 'Sync started in background' };
  }

  /**
   * Trigger sync for a specific client
   */
  async triggerSyncForClient(
    clientId: number,
  ): Promise<{ message: string; result?: any }> {
    try {
      const result = await this.responseSyncService.syncClientResponses(clientId);
      return {
        message: `Sync completed for client ${clientId}`,
        result,
      };
    } catch (error) {
      throw new BadRequestException(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Get the full conversation thread for a response
   */
  async getThread(responseId: number): Promise<{
    originalEmail: EmailSend;
    responses: EmailResponse[];
  }> {
    const response = await this.findOne(responseId);

    const originalEmail = await this.emailSendRepository.findOne({
      where: { id: response.emailSendId },
      relations: ['client', 'jobOffer'],
    });

    if (!originalEmail) {
      throw new NotFoundException('Original email not found');
    }

    const responses = await this.responseRepository.find({
      where: { emailSendId: originalEmail.id },
      order: { receivedAt: 'ASC' },
    });

    return { originalEmail, responses };
  }

  /**
   * Delete a response
   */
  async delete(id: number): Promise<void> {
    const response = await this.findOne(id);
    await this.responseRepository.remove(response);
    this.logger.log(`Response ${id} deleted`);
  }

  /**
   * Generate an AI-powered reply suggestion for a response
   */
  async generateReplySuggestion(responseId: number): Promise<{
    suggestedSubject: string;
    suggestedBody: string;
    suggestedHtml: string;
    context: {
      classification: string;
      originalSubject: string;
      recipientEmail: string;
      clientEmail: string;
    };
  }> {
    const response = await this.findOne(responseId);
    const { originalEmail } = await this.getThread(responseId);

    const client = originalEmail.client;
    const jobOffer = originalEmail.jobOffer;

    if (!client) {
      throw new BadRequestException('No se encontró el cliente asociado');
    }

    const context: ReplyGeneratorContext = {
      originalSubject: originalEmail.subjectSnapshot || '',
      originalRecipient: originalEmail.recipientEmail,
      originalRecipientName: response.fromName || undefined,
      responseSubject: response.subject,
      responseBody: response.bodyText || this.stripHtml(response.bodyHtml || ''),
      responseClassification: response.classification,
      clientName: client.nombre || '',
      clientLastName: client.apellido || '',
      clientJobTitle: client.jobTitle || undefined,
      jobPosition: jobOffer?.puesto,
      jobCompany: jobOffer?.empresa || jobOffer?.hotel,
      jobCity: jobOffer?.ciudad,
    };

    const suggestion = await this.aiService.generateReply(context);

    this.logger.log(
      `Reply suggestion generated for response ${responseId} (classification: ${response.classification})`,
    );

    return {
      suggestedSubject: suggestion.subject,
      suggestedBody: suggestion.body,
      suggestedHtml: this.convertToSimpleHtml(suggestion.body, client),
      context: {
        classification: response.classification,
        originalSubject: originalEmail.subjectSnapshot || '',
        recipientEmail: response.fromEmail,
        clientEmail: client.emailOperativo || client.email || '',
      },
    };
  }

  /**
   * Send a reply to an email response
   */
  async sendReply(
    responseId: number,
    subject: string,
    htmlContent: string,
  ): Promise<{
    success: boolean;
    messageId: string;
    threadId: string;
    sentAt: Date;
  }> {
    const response = await this.findOne(responseId);
    const { originalEmail } = await this.getThread(responseId);

    const client = originalEmail.client;
    if (!client?.emailOperativo) {
      throw new BadRequestException(
        'El cliente no tiene un email operativo configurado. Configure el email operativo antes de enviar respuestas.',
      );
    }

    this.logger.log(
      `Sending reply for response ${responseId} from ${client.emailOperativo} to ${response.fromEmail}`,
    );

    // Log threading information for debugging
    this.logger.debug(
      `Threading info - ThreadID: ${response.gmailThreadId}, ` +
      `InReplyTo: ${response.inReplyTo || 'N/A'}, ` +
      `MessageID: ${response.gmailMessageId}, ` +
      `References: ${response.referencesHeader ? 'Present' : 'N/A'}`,
    );

    // Send email as reply in the same thread
    const result = await this.emailService.sendReplyInThread(
      response.fromEmail, // To: quien envió la respuesta original
      subject,
      htmlContent,
      client.emailOperativo, // From: email del cliente
      response.gmailThreadId, // Thread ID para mantener conversación
      response.gmailMessageId, // Message-ID del mensaje al que respondemos
      response.referencesHeader, // Cadena completa de referencias existentes
    );

    // Mark response as read since we've replied
    await this.responseRepository.update(responseId, {
      isRead: true,
    });

    this.logger.log(
      `Reply sent successfully. MessageID: ${result.messageId}, ThreadID: ${result.threadId}`,
    );

    return {
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
      sentAt: new Date(),
    };
  }

  /**
   * Convert plain text to simple HTML email format
   */
  private convertToSimpleHtml(body: string, client: any): string {
    const clientName = `${client?.nombre || ''} ${client?.apellido || ''}`.trim();
    const clientEmail = client?.emailOperativo || client?.email || '';
    const clientPhone = client?.phone || '';

    const paragraphs = body
      .split(/\n\n+/)
      .filter((p) => p.trim())
      .map(
        (p) =>
          `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${paragraphs}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eeeeee;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #333333;">${clientName}</p>
      ${clientEmail ? `<p style="margin: 0 0 4px 0; color: #666666;">${clientEmail}</p>` : ''}
      ${clientPhone ? `<p style="margin: 0; color: #666666;">${clientPhone}</p>` : ''}
    </div>
  </div>
</body>
</html>`.trim();
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
