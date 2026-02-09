import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { SendJob, SendJobStatus } from '../entities/send-job.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientSendSettings)
    private readonly settingsRepository: Repository<ClientSendSettings>,
    @InjectRepository(SendJob)
    private readonly sendJobRepository: Repository<SendJob>,
  ) {}

  // Run every day at 06:00 AM (server time/UTC) - configurable via environment
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyJobCreation() {
    this.logger.log('Starting daily job creation process...');

    // 1. Fetch active clients with active send settings
    const activeClients = await this.clientRepository.find({
      where: { estado: 'In Progress' },
      relations: ['sendSettings'],
    });

    this.logger.log(`Found ${activeClients.length} active clients.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const client of activeClients) {
      if (!client.sendSettings || !client.sendSettings.active) {
        this.logger.warn(
          `Client ${client.id} (${client.zohoId}) has no active send settings. Skipping.`,
        );
        continue;
      }

      // Check if job already exists for today
      const existingJob = await this.sendJobRepository
        .createQueryBuilder('job')
        .where('job.client_id = :clientId', { clientId: client.id })
        .andWhere('DATE(job.scheduled_date) = DATE(:date)', { date: today })
        .getOne();

      if (existingJob) {
        this.logger.log(
          `Job already exists for client ${client.id} today. Skipping.`,
        );
        continue;
      }

      await this.createDailyJob(client, client.sendSettings);
    }
  }

  private async createDailyJob(client: Client, settings: ClientSendSettings) {
    let emailsToSend = settings.currentDailyLimit;

    // Warmup Logic - Incremento gradual hasta alcanzar el objetivo
    if (
      settings.isWarmupActive &&
      settings.currentDailyLimit < settings.targetDailyLimit
    ) {
      // Incrementar por el valor configurado
      const increment = settings.warmupDailyIncrement || 2;
      let newLimit = settings.currentDailyLimit + increment;

      // No superar el objetivo
      if (newLimit > settings.targetDailyLimit) {
        newLimit = settings.targetDailyLimit;
      }

      emailsToSend = newLimit;

      // Update settings with new limit for next day
      settings.currentDailyLimit = newLimit;
      await this.settingsRepository.save(settings);
      this.logger.log(
        `Warmup: Increased limit for Client ${client.id} from ${settings.currentDailyLimit - increment} to ${newLimit} (+${increment})`,
      );
    }

    // Create Job
    const job = this.sendJobRepository.create({
      client: client,
      scheduledDate: new Date(),
      status: SendJobStatus.QUEUED,
      emailsToSend: emailsToSend,
      emailsSentCount: 0,
    });

    await this.sendJobRepository.save(job);
    this.logger.log(
      `Created daily job for Client ${client.id} with target ${emailsToSend} emails.`,
    );
  }
}
