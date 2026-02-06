import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity';
import { EmailResponse, ResponseClassification } from '../entities/email-response.entity';
import { Client } from '../entities/client.entity';
import { GmailReaderService, GmailMessage } from './gmail-reader.service';
import { AiService } from '../ai/ai.service';

export interface SyncResult {
  clientId: number;
  emailsChecked: number;
  newResponses: number;
  errors: number;
}

@Injectable()
export class ResponseSyncService {
  private readonly logger = new Logger(ResponseSyncService.name);
  private isSyncing = false;

  constructor(
    @InjectRepository(EmailSend)
    private emailSendRepository: Repository<EmailSend>,
    @InjectRepository(EmailResponse)
    private emailResponseRepository: Repository<EmailResponse>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private gmailReaderService: GmailReaderService,
    private configService: ConfigService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) { }

  /**
   * Cron job that runs every 15 minutes to sync responses
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAllResponses(): Promise<void> {
    // Check if sync is enabled
    const syncEnabled = this.configService.get<boolean>('GMAIL_SYNC_ENABLED', true);
    if (!syncEnabled) {
      this.logger.warn('⚠️  Gmail sync is DISABLED via GMAIL_SYNC_ENABLED config');
      return;
    }

    if (this.isSyncing) {
      this.logger.debug('Response sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    this.logger.log('🔄 Starting scheduled response sync...');

    try {
      // Get all active clients with sent emails
      const clients = await this.clientRepository.find({
        where: {
          sendSettings: {
            active: true,
          },
        },
        relations: ['sendSettings'],
      });

      this.logger.log(`📋 Found ${clients.length} active clients to check for responses`);

      if (clients.length === 0) {
        this.logger.warn('⚠️  No active clients found with send settings');
      }

      let totalNewResponses = 0;
      let totalErrors = 0;

      for (const client of clients) {
        try {
          this.logger.debug(`Syncing client ${client.id} (${client.nombre || 'Unknown'})...`);
          const result = await this.syncClientResponses(client.id);
          totalNewResponses += result.newResponses;
          totalErrors += result.errors;
        } catch (error) {
          this.logger.error(
            `❌ Failed to sync responses for client ${client.id}: ${error.message}`,
          );
          totalErrors++;
        }
      }

      this.logger.log(
        `✅ Response sync completed. New responses: ${totalNewResponses}, Errors: ${totalErrors}`,
      );
    } catch (error) {
      this.logger.error(`Response sync failed: ${error.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync responses for a specific client
   */
  async syncClientResponses(clientId: number): Promise<SyncResult> {
    const result: SyncResult = {
      clientId,
      emailsChecked: 0,
      newResponses: 0,
      errors: 0,
    };

    // Get client with email
    const client = await this.clientRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      this.logger.warn(`Client ${clientId} not found`);
      return result;
    }

    const userEmail = client.emailOperativo || client.email;
    if (!userEmail) {
      this.logger.warn(`Client ${clientId} has no email configured`);
      return result;
    }

    // Get sent emails with threadId for this client
    const sentEmails = await this.emailSendRepository.find({
      where: {
        clientId,
        status: EmailSendStatus.SENT,
        gmailThreadId: Not(IsNull()),
      },
      order: { sentAt: 'DESC' },
      take: 100, // Limit to recent 100 emails
    });

    if (sentEmails.length === 0) {
      this.logger.warn(`⚠️  No sent emails with threadId found for client ${clientId}`);
      return result;
    }

    this.logger.debug(
      `📧 Checking ${sentEmails.length} sent emails for client ${clientId}`,
    );

    for (const email of sentEmails) {
      try {
        result.emailsChecked++;

        // Get all messages in the thread
        const messages = await this.gmailReaderService.getThreadMessages(
          userEmail,
          email.gmailThreadId,
        );

        // Filter to only replies (messages not sent by the user)
        const replies = messages.filter((msg) => {
          const fromLower = msg.from.toLowerCase();
          const userLower = userEmail.toLowerCase();
          return !fromLower.includes(userLower);
        });

        // Process each reply
        for (const reply of replies) {
          const saved = await this.saveResponse(email, reply);
          if (saved) {
            result.newResponses++;
          }
        }

        // Update email send record if there are new responses
        if (replies.length > 0) {
          const responseCount = await this.emailResponseRepository.count({
            where: { emailSendId: email.id },
          });

          if (responseCount > 0) {
            const latestResponse = await this.emailResponseRepository.findOne({
              where: { emailSendId: email.id },
              order: { receivedAt: 'DESC' },
            });

            email.hasResponses = true;
            email.responseCount = responseCount;
            email.lastResponseAt = latestResponse?.receivedAt || null;
            await this.emailSendRepository.save(email);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Error checking thread for email ${email.id}: ${error.message}`,
        );
        result.errors++;
      }
    }

    const emoji = result.newResponses > 0 ? '💬' : '✓';
    this.logger.log(
      `${emoji} Client ${clientId} sync: ${result.emailsChecked} checked, ${result.newResponses} new responses, ${result.errors} errors`,
    );

    return result;
  }

  /**
   * Save a response message to the database if it doesn't exist
   */
  private async saveResponse(
    emailSend: EmailSend,
    message: GmailMessage,
  ): Promise<boolean> {
    // Check if we already have this message
    const exists = await this.emailResponseRepository.findOne({
      where: { gmailMessageId: message.id },
    });

    if (exists) {
      return false;
    }

    // Create new response record
    const response = this.emailResponseRepository.create({
      emailSend: { id: emailSend.id },
      gmailMessageId: message.id,
      gmailThreadId: message.threadId,
      fromEmail: message.from,
      fromName: message.fromName,
      subject: message.subject,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      receivedAt: message.receivedAt,
      inReplyTo: message.inReplyTo,
      referencesHeader: message.references,
      classification: ResponseClassification.SIN_CLASIFICAR,
      isRead: false,
    } as any);

    const savedData = await this.emailResponseRepository.save(response);
    const savedResponse = Array.isArray(savedData) ? savedData[0] : savedData;

    this.logger.log(
      `💾 Saved new response from ${message.from} for email ${emailSend.id}`,
    );

    // Classify the response with AI (async, don't block)
    this.classifyResponseAsync(savedResponse, emailSend);

    return true;
  }

  /**
   * Classify a response asynchronously using AI
   */
  private async classifyResponseAsync(
    response: EmailResponse,
    emailSend: EmailSend,
  ): Promise<void> {
    try {
      const bodyText = response.bodyText || this.stripHtml(response.bodyHtml || '');

      const result = await this.aiService.classifyResponse(
        response.subject,
        bodyText,
        emailSend.subjectSnapshot || undefined,
        emailSend.recipientEmail,
      );

      // Update the response with classification
      response.classification = result.classification;
      response.classificationConfidence = result.confidence;
      response.classificationReasoning = result.reasoning;
      response.classifiedAt = new Date();

      await this.emailResponseRepository.save(response);

      this.logger.log(
        `Response ${response.id} classified as "${result.classification}" (${Math.round(result.confidence * 100)}%)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to classify response ${response.id}: ${error.message}`,
      );
    }
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

  /**
   * Manual trigger to sync a specific email's thread
   */
  async syncEmailThread(emailId: number): Promise<number> {
    const email = await this.emailSendRepository.findOne({
      where: { id: emailId },
      relations: ['client'],
    });

    if (!email || !email.gmailThreadId) {
      this.logger.warn(`Email ${emailId} not found or has no threadId`);
      return 0;
    }

    const userEmail = email.client.emailOperativo || email.client.email;
    if (!userEmail) {
      return 0;
    }

    try {
      const messages = await this.gmailReaderService.getThreadMessages(
        userEmail,
        email.gmailThreadId,
      );

      let newCount = 0;
      const replies = messages.filter((msg) => {
        const fromLower = msg.from.toLowerCase();
        const userLower = userEmail.toLowerCase();
        return !fromLower.includes(userLower);
      });

      for (const reply of replies) {
        const saved = await this.saveResponse(email, reply);
        if (saved) {
          newCount++;
        }
      }

      // Update email send record
      const responseCount = await this.emailResponseRepository.count({
        where: { emailSendId: email.id },
      });

      if (responseCount > 0) {
        const latestResponse = await this.emailResponseRepository.findOne({
          where: { emailSendId: email.id },
          order: { receivedAt: 'DESC' },
        });

        email.hasResponses = true;
        email.responseCount = responseCount;
        email.lastResponseAt = latestResponse?.receivedAt || null;
        await this.emailSendRepository.save(email);
      }

      return newCount;
    } catch (error) {
      this.logger.error(
        `Failed to sync thread for email ${emailId}: ${error.message}`,
      );
      throw error;
    }
  }
}
