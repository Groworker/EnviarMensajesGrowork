import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SendJob, SendJobStatus } from '../entities/send-job.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { EmailReputation } from '../entities/email-reputation.entity';
import { Client } from '../entities/client.entity';
import { GlobalSendConfig } from '../entities/global-send-config.entity';

import { EmailService } from '../email/email.service';
import { AiService } from '../ai/ai.service';
import { DriveService } from '../drive/drive.service';
import { EmailAttachment } from '../drive/interfaces/drive-file.interface';
import { GlobalConfigService } from '../email/global-config.service';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(SendJob)
    private sendJobRepository: Repository<SendJob>,
    @InjectRepository(JobOffer)
    private jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(EmailSend)
    private emailSendRepository: Repository<EmailSend>,
    @InjectRepository(ClientSendSettings)
    private settingsRepository: Repository<ClientSendSettings>,
    @InjectRepository(EmailReputation)
    private reputationRepository: Repository<EmailReputation>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private emailService: EmailService,
    private aiService: AiService,
    private driveService: DriveService,
    private configService: ConfigService,
    private globalConfigService: GlobalConfigService,
  ) { }

  // Run frequently to process queue
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (this.isProcessing) {
      this.logger.debug('Worker is already processing. Skipping.');
      return;
    }
    this.isProcessing = true;

    try {
      this.logger.log('Checking for pending send jobs...');

      const jobs = await this.sendJobRepository.find({
        where: { status: In([SendJobStatus.QUEUED, SendJobStatus.RUNNING]) },
        relations: ['client', 'client.sendSettings'],
      });

      for (const job of jobs) {
        if (job.status === SendJobStatus.QUEUED) {
          job.status = SendJobStatus.RUNNING;
          job.startedAt = new Date();
          await this.sendJobRepository.save(job);
        }

        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error('Error in worker process', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if current time is within allowed sending hours
   */
  private async isWithinSendingHours(): Promise<boolean> {
    const config = await this.globalConfigService.getConfig();

    if (!config.enabled) {
      return true; // If restrictions disabled, always allow
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight ranges (e.g., 22:00 - 06:00)
    if (config.endHour < config.startHour) {
      return currentHour >= config.startHour || currentHour < config.endHour;
    }

    // Normal range (e.g., 09:00 - 18:00)
    return currentHour >= config.startHour && currentHour < config.endHour;
  }

  /**
   * Get random delay in milliseconds based on config
   */
  private async getRandomDelay(): Promise<number> {
    const config = await this.globalConfigService.getConfig();

    if (!config.enabled) {
      return 0; // No delay if restrictions disabled
    }

    // Convert minutes to milliseconds
    const minMs = config.minDelayMinutes * 60 * 1000;
    const maxMs = config.maxDelayMinutes * 60 * 1000;
    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    return randomMs;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async processJob(job: SendJob) {
    const remaining = job.emailsToSend - job.emailsSentCount;
    if (remaining <= 0) {
      job.status = SendJobStatus.DONE;
      job.finishedAt = new Date();
      await this.sendJobRepository.save(job);
      return;
    }

    // Batch size for this run
    const batchSize = Math.min(remaining, 5); // Process 5 at a time per tick per job
    this.logger.log(
      `Processing Job ${job.id} for Client ${job.clientId}. Remaining: ${remaining}. Batch: ${batchSize}`,
    );

    // Verify settings are loaded (should come from relations)
    if (!job.client || !job.client.sendSettings) {
      this.logger.warn(
        `No send settings found for Client ${job.clientId}. Skipping.`,
      );
      return;
    }

    // Find Candidates using client fields
    const candidates = await this.findCandidates(
      job.client,
      job.client.sendSettings,
      batchSize,
    );

    if (candidates.length === 0) {
      this.logger.warn(`No more candidates found for Client ${job.clientId}`);
      return;
    }

    // Check if we're within sending hours
    const canSend = await this.isWithinSendingHours();
    if (!canSend) {
      const now = new Date();
      this.logger.log(
        `⏰ Outside sending hours (current: ${now.getHours()}:${now.getMinutes()}). Skipping job ${job.id}`,
      );
      return;
    }

    for (let i = 0; i < candidates.length; i++) {
      const offer = candidates[i];

      // Apply delay before sending (except for first email)
      if (i > 0) {
        const delayMs = await this.getRandomDelay();
        if (delayMs > 0) {
          this.logger.debug(
            `⏳ Waiting ${(delayMs / 1000).toFixed(1)}s before next email...`,
          );
          await this.sleep(delayMs);
        }
      }

      await this.sendEmailForOffer(job, offer);
    }
  }

  private async findCandidates(
    client: any,
    settings: ClientSendSettings,
    limit: number,
  ): Promise<JobOffer[]> {
    // 1. Get IDs of already sent offers for this client (and partner if couple)
    const clientIds = [client.id];
    if (client.parejaId) {
      clientIds.push(client.parejaId);
    }

    const sentOffers = await this.emailSendRepository
      .createQueryBuilder('s')
      .select('s.job_offer_id')
      .where('s.client_id IN (:...clientIds)', { clientIds })
      .getRawMany<{ job_offer_id: number }>();

    const sentIds = sentOffers.map((s) => s.job_offer_id);
    const excludeIds = sentIds.length > 0 ? sentIds : [-1];

    // 2. Build Query based on Client Fields
    const qb = this.jobOfferRepository
      .createQueryBuilder('offer')
      .where('offer.id NOT IN (:...excludeIds)', { excludeIds });

    // Exclude Bad Reputation Emails
    const badEmails = await this.reputationRepository.find({
      where: [{ is_bounced: true }, { is_invalid: true }],
      select: ['email'],
    });

    if (badEmails.length > 0) {
      const badEmailList = badEmails.map((e) => e.email);
      qb.andWhere('offer.email NOT IN (:...badEmailList)', { badEmailList });
    }

    // 3. Normalizar datos de Zoho (formato {values: []} a array directo)
    // Manejar tanto arrays como strings en values
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

    // 4. Apply matching criteria based on client fields
    const criteria = settings?.matchingCriteria || {};
    const matchMode = criteria.matchMode || 'all';
    const enabledFilters = criteria.enabledFilters;

    const conditions: string[] = [];
    const parameters: any = {};

    // Helper function to check if a filter is enabled
    const isFilterEnabled = (filterName: string): boolean => {
      if (!enabledFilters || enabledFilters.length === 0) {
        return true; // If no explicit configuration, all filters active
      }
      return enabledFilters.includes(filterName);
    };

    // FILTER: Countries (from client.paisesInteres)
    if (
      isFilterEnabled('countries') &&
      paisesInteres &&
      paisesInteres.length > 0
    ) {
      conditions.push('offer.pais IN (:...countries)');
      parameters.countries = paisesInteres;
    }

    // FILTER: Cities (from client.ciudadesInteres)
    if (
      isFilterEnabled('cities') &&
      ciudadesInteres &&
      ciudadesInteres.length > 0
    ) {
      conditions.push('offer.ciudad IN (:...cities)');
      parameters.cities = ciudadesInteres;
    }

    // FILTER: Job Title (from client.jobTitle)
    if (isFilterEnabled('jobTitle') && client.jobTitle) {
      const jobTitleMode = criteria.jobTitleMatchMode || 'contains';

      if (jobTitleMode === 'none') {
        // Do nothing - explicitly enabled but set to 'none' means "don't filter"
        // This is useful when the check is ON in the UI but the user chose "Ninguno"
      } else if (jobTitleMode === 'exact') {
        conditions.push('LOWER(offer.puesto) = LOWER(:jobTitle)');
        parameters.jobTitle = client.jobTitle;
      } else {
        // contains mode - case-insensitive partial match
        conditions.push('offer.puesto ILIKE :jobTitle');
        parameters.jobTitle = `%${client.jobTitle}%`;
      }
    }

    // 5. Apply conditions based on matchMode
    if (conditions.length > 0) {
      if (matchMode === 'all') {
        // AND logic - all conditions must match
        const combinedCondition = conditions.join(' AND ');
        qb.andWhere(`(${combinedCondition})`, parameters);
      } else {
        // OR logic - any condition matches
        const combinedCondition = conditions.join(' OR ');
        qb.andWhere(`(${combinedCondition})`, parameters);
      }
    }

    // 6. Order by date scraped descending and limit
    qb.orderBy('offer.fechaScrape', 'DESC');
    qb.take(limit);

    return qb.getMany();
  }

  private async sendEmailForOffer(job: SendJob, offer: JobOffer) {
    // 1. Check duplicate again to be safe (race condition)
    const exists = await this.emailSendRepository.findOne({
      where: { clientId: job.clientId, jobOfferId: offer.id },
    });
    if (exists) return;

    // 2. Reserve
    const emailSend = this.emailSendRepository.create({
      clientId: job.clientId,
      jobOfferId: offer.id,
      sendJobId: job.id,
      recipientEmail: offer.email,
      status: EmailSendStatus.RESERVED,
    });
    await this.emailSendRepository.save(emailSend);

    try {
      // 3. Get client info and load partner if exists
      const client = job.client;
      const senderEmail = client.emailOperativo || client.email;
      if (!client || !senderEmail) {
        throw new Error(
          `Client email is missing for job ${job.id} (client ID: ${client?.id})`,
        );
      }

      let pareja: Client | null = null;
      if (client.parejaId) {
        pareja = await this.clientRepository.findOne({
          where: { id: client.parejaId },
        });
      }

      // Also check partner hasn't already sent to this offer
      if (pareja) {
        const parejaExists = await this.emailSendRepository.findOne({
          where: { clientId: pareja.id, jobOfferId: offer.id },
        });
        if (parejaExists) return;
      }

      // 4. Generate email content with AI (or fallback to template)
      let subject: string;
      let content: string;
      let aiGenerated = false;
      let aiModel: string | null = null;

      try {
        const aiResult = await this.aiService.generateEmailContent(
          client,
          offer,
          pareja,
        );
        subject = aiResult.subject;
        content = aiResult.htmlContent;
        aiGenerated = true;
        aiModel = this.configService.get<string>('openai.model') ?? null;
        this.logger.log(
          `AI generated email for client ${client.id}${pareja ? ` (couple with ${pareja.id})` : ''} to ${offer.email}`,
        );
      } catch (aiError) {
        // Fallback to template if AI fails
        this.logger.warn(
          `AI generation failed, using fallback template: ${aiError}`,
        );
        const clientName = pareja
          ? `${client.nombre} y ${pareja.nombre}`
          : `${client.nombre} ${client.apellido}`;
        subject = `Candidatura para ${offer.puesto} - ${clientName}`;
        content = this.generateEmailContent(client, offer, pareja);
      }

      // 5. Get attachments from Google Drive (DEFINITIVA folder - both partners if couple)
      let attachments: EmailAttachment[] = [];
      try {
        if (pareja) {
          attachments = await this.driveService.getAttachmentsForCouple(client, pareja);
        } else {
          attachments = await this.driveService.getAttachmentsForClient(client);
        }
        this.logger.log(
          `Retrieved ${attachments.length} attachments for client ${client.id}${pareja ? ` + partner ${pareja.id}` : ''}`,
        );
      } catch (driveError) {
        this.logger.warn(
          `Failed to get attachments from Drive, continuing without: ${driveError}`,
        );
      }

      // 6. Check if preview is enabled for this client
      const previewEnabled = job.client.sendSettings?.previewEnabled ?? true;

      if (previewEnabled) {
        // Save for manual review - don't send yet
        emailSend.status = EmailSendStatus.PENDING_REVIEW;
        emailSend.subjectSnapshot = subject;
        emailSend.content_snapshot = content;
        emailSend.aiGenerated = aiGenerated;
        emailSend.aiModel = aiModel;
        emailSend.attachmentsCount = attachments.length;
        await this.emailSendRepository.save(emailSend);

        this.logger.log(
          `Email queued for review: client ${client.id}, offer ${offer.id}`,
        );

        // Still increment job counter since the email is "processed"
        await this.sendJobRepository.increment(
          { id: job.id },
          'emailsSentCount',
          1,
        );
        return;
      }

      // 7. Send Email immediately (preview disabled)
      const sendResult = await this.emailService.sendEmail(
        offer.email,
        subject,
        content,
        senderEmail,
        attachments,
      );

      this.logger.log(
        `Email sent from ${senderEmail} to ${offer.email} with ${attachments.length} attachments. ID: ${sendResult.messageId}, ThreadID: ${sendResult.threadId}`,
      );

      // 8. Update Status
      emailSend.status = EmailSendStatus.SENT;
      emailSend.messageId = sendResult.messageId;
      emailSend.gmailThreadId = sendResult.threadId;
      emailSend.subjectSnapshot = subject;
      emailSend.content_snapshot = content;
      emailSend.aiGenerated = aiGenerated;
      emailSend.aiModel = aiModel;
      emailSend.attachmentsCount = attachments.length;
      emailSend.sentAt = new Date();

      // Debug logging
      this.logger.debug(`About to save email with threadId: ${sendResult.threadId} (type: ${typeof sendResult.threadId})`);

      await this.emailSendRepository.save(emailSend);

      // 9. Update Job Counter
      await this.sendJobRepository.increment(
        { id: job.id },
        'emailsSentCount',
        1,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${offer.email}`, error);
      emailSend.status = EmailSendStatus.FAILED;
      await this.emailSendRepository.save(emailSend);
    }
  }

  private generateEmailContent(client: Client, offer: JobOffer, pareja?: Client | null): string {
    const isCouple = !!pareja;
    const clientName = isCouple
      ? `${client.nombre} ${client.apellido} y ${pareja.nombre} ${pareja.apellido}`
      : `${client.nombre} ${client.apellido}`;
    const position = offer.puesto || 'el puesto disponible';
    const company = offer.empresa || offer.hotel || 'su empresa';
    const location = offer.ciudad
      ? `${offer.ciudad}${offer.pais ? `, ${offer.pais}` : ''}`
      : offer.pais || '';

    const introText = isCouple
      ? `Nuestros nombres son <span class="highlight">${clientName}</span> y nos dirigimos a ustedes con gran interés
        en la posición de <span class="highlight">${position}</span>${location ? ` en ${location}` : ''}.`
      : `Mi nombre es <span class="highlight">${clientName}</span> y me dirijo a ustedes con gran interés
        en la posición de <span class="highlight">${position}</span>${location ? ` en ${location}` : ''}.`;

    const experienceText = isCouple
      ? `Contamos con experiencia en el sector ${client.industria || 'hotelero'} y estamos entusiasmados por
        la oportunidad de formar parte de su equipo. Adjuntamos nuestros CVs para su consideración.`
      : `Cuento con experiencia en el sector ${client.industria || 'hotelero'} y estoy entusiasmado/a por
        la oportunidad de formar parte de su equipo. Adjunto mi CV para su consideración.`;

    const availabilityText = isCouple
      ? `Quedamos a su disposición para ampliar cualquier información que consideren necesaria
        y para concertar una entrevista en la fecha que mejor les convenga.`
      : `Quedo a su disposición para ampliar cualquier información que consideren necesaria
        y para concertar una entrevista en la fecha que mejor les convenga.`;

    const closingText = isCouple
      ? 'Agradecemos de antemano su atención y quedamos a la espera de sus noticias.'
      : 'Agradezco de antemano su atención y quedo a la espera de sus noticias.';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    .highlight { color: #0066cc; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; color: #0066cc;">Candidatura para ${position}</h2>
    </div>

    <div class="content">
      <p>Estimado/a responsable de ${company},</p>

      <p>${introText}</p>

      <p>${experienceText}</p>

      <p>${availabilityText}</p>

      <p>${closingText}</p>

      <p>
        Atentamente,<br>
        <strong>${clientName}</strong><br>
        ${client.emailOperativo || client.email || ''}${client.phone ? `<br>${client.phone}` : ''}
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0; font-size: 0.85em;">
        Este correo ha sido enviado en respuesta a su oferta de trabajo publicada.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
