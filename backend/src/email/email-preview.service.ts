import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity';
import { EmailService } from './email.service';
import { AiService } from '../ai/ai.service';
import { DriveService } from '../drive/drive.service';
import { UpdateEmailDto } from './dto/update-email.dto';
import { EmailAttachment } from '../drive/interfaces/drive-file.interface';

@Injectable()
export class EmailPreviewService {
  private readonly logger = new Logger(EmailPreviewService.name);

  constructor(
    @InjectRepository(EmailSend)
    private emailSendRepository: Repository<EmailSend>,
    private emailService: EmailService,
    private aiService: AiService,
    private driveService: DriveService,
    private configService: ConfigService,
  ) { }

  /**
   * Get all emails pending review, optionally filtered by client
   */
  async getPendingEmails(clientId?: number): Promise<EmailSend[]> {
    const whereClause: any = { status: EmailSendStatus.PENDING_REVIEW };
    if (clientId) {
      whereClause.clientId = clientId;
    }

    return this.emailSendRepository.find({
      where: whereClause,
      relations: ['client', 'jobOffer'],
      order: { sentAt: 'DESC' },
    });
  }

  /**
   * Get a single email by ID with full details
   */
  async getEmailById(id: number): Promise<EmailSend> {
    const email = await this.emailSendRepository.findOne({
      where: { id },
      relations: ['client', 'jobOffer', 'sendJob'],
    });

    if (!email) {
      throw new NotFoundException(`Email with ID ${id} not found`);
    }

    return email;
  }

  /**
   * Approve an email and send it
   */
  async approveAndSend(id: number): Promise<EmailSend> {
    const email = await this.getEmailById(id);

    if (email.status !== EmailSendStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Email ${id} is not pending review. Current status: ${email.status}`,
      );
    }

    // Get sender email
    const senderEmail =
      email.client.emailOperativo || email.client.email;
    if (!senderEmail) {
      throw new BadRequestException(
        `Client ${email.clientId} has no email configured`,
      );
    }

    // Get attachments from Drive
    let attachments: EmailAttachment[] = [];
    try {
      attachments = await this.driveService.getAttachmentsForClient(
        email.client,
      );
      this.logger.log(
        `Retrieved ${attachments.length} attachments for sending`,
      );
    } catch (driveError) {
      this.logger.warn(
        `Failed to get attachments, sending without: ${driveError}`,
      );
    }

    // Send the email
    const sendResult = await this.emailService.sendEmail(
      email.recipientEmail,
      email.subjectSnapshot || `Candidatura - ${email.client.nombre}`,
      email.content_snapshot || '',
      senderEmail,
      attachments,
    );

    // Update status
    email.status = EmailSendStatus.SENT;
    email.messageId = sendResult.messageId;
    email.gmailThreadId = sendResult.threadId;
    email.reviewedAt = new Date();
    email.sentAt = new Date();
    email.attachmentsCount = attachments.length;

    await this.emailSendRepository.save(email);

    this.logger.log(
      `Email ${id} approved and sent to ${email.recipientEmail}`,
    );

    return email;
  }

  /**
   * Reject an email - marks it as rejected
   */
  async reject(id: number): Promise<EmailSend> {
    const email = await this.getEmailById(id);

    if (email.status !== EmailSendStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Email ${id} is not pending review. Current status: ${email.status}`,
      );
    }

    email.status = EmailSendStatus.REJECTED;
    email.reviewedAt = new Date();

    await this.emailSendRepository.save(email);

    this.logger.log(`Email ${id} rejected`);

    return email;
  }

  /**
   * Regenerate email content using AI
   */
  async regenerate(id: number): Promise<EmailSend> {
    const email = await this.getEmailById(id);

    if (email.status !== EmailSendStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Email ${id} is not pending review. Current status: ${email.status}`,
      );
    }

    try {
      const result = await this.aiService.generateEmailContent(
        email.client,
        email.jobOffer,
      );

      email.subjectSnapshot = result.subject;
      email.content_snapshot = result.htmlContent;
      email.aiGenerated = true;
      email.aiModel = this.configService.get<string>('openai.model') || 'gpt-4o-mini';

      await this.emailSendRepository.save(email);

      this.logger.log(`Email ${id} regenerated with AI`);

      return email;
    } catch (error) {
      this.logger.error(`Failed to regenerate email ${id}`, error);
      throw new BadRequestException(
        `Failed to regenerate email: ${error.message}`,
      );
    }
  }

  /**
   * Manually update email subject and/or content
   */
  async updateEmail(id: number, dto: UpdateEmailDto): Promise<EmailSend> {
    const email = await this.getEmailById(id);

    if (email.status !== EmailSendStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Email ${id} is not pending review. Current status: ${email.status}`,
      );
    }

    if (dto.subject) {
      email.subjectSnapshot = dto.subject;
    }

    if (dto.content) {
      email.content_snapshot = dto.content;
    }

    // Mark as manually edited (not AI generated)
    if (dto.subject || dto.content) {
      email.aiGenerated = false;
      email.aiModel = null;
    }

    await this.emailSendRepository.save(email);

    this.logger.log(`Email ${id} manually updated`);

    return email;
  }

  /**
   * Delete a pending email
   */
  async deleteEmail(id: number): Promise<void> {
    const email = await this.getEmailById(id);

    if (email.status !== EmailSendStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Email ${id} is not pending review. Current status: ${email.status}`,
      );
    }

    await this.emailSendRepository.remove(email);

    this.logger.log(`Email ${id} deleted`);
  }

  /**
   * Delete all pending emails (optionally filtered by client)
   */
  async deleteAllPending(clientId?: number): Promise<{ deleted: number }> {
    const whereClause: any = { status: EmailSendStatus.PENDING_REVIEW };
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const emails = await this.emailSendRepository.find({
      where: whereClause,
    });

    const count = emails.length;
    if (count > 0) {
      await this.emailSendRepository.remove(emails);
    }

    this.logger.log(`Deleted ${count} pending emails`);

    return { deleted: count };
  }

  /**
   * Get all emails approved today (sent after review)
   */
  async getApprovedTodayEmails(): Promise<EmailSend[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.emailSendRepository
      .createQueryBuilder('email')
      .leftJoinAndSelect('email.client', 'client')
      .leftJoinAndSelect('email.jobOffer', 'jobOffer')
      .where('email.status = :status', { status: EmailSendStatus.SENT })
      .andWhere('email.reviewed_at >= :today', { today })
      .orderBy('email.reviewed_at', 'DESC')
      .getMany();
  }

  /**
   * Get statistics for pending emails
   */
  async getStats(): Promise<{
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  }> {
    const pending = await this.emailSendRepository.count({
      where: { status: EmailSendStatus.PENDING_REVIEW },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const approvedToday = await this.emailSendRepository
      .createQueryBuilder('email')
      .where('email.status = :status', { status: EmailSendStatus.SENT })
      .andWhere('email.reviewed_at >= :today', { today })
      .getCount();

    const rejectedToday = await this.emailSendRepository
      .createQueryBuilder('email')
      .where('email.status = :status', { status: EmailSendStatus.REJECTED })
      .andWhere('email.reviewed_at >= :today', { today })
      .getCount();

    return {
      pending,
      approvedToday,
      rejectedToday,
    };
  }
}
