import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { SendJob } from '../../entities/send-job.entity';
import { EmailSend } from '../../entities/email-send.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(SendJob)
    private sendJobRepository: Repository<SendJob>,
    @InjectRepository(EmailSend)
    private emailSendRepository: Repository<EmailSend>,
  ) {}

  async getStats() {
    const totalClients = await this.clientRepository.count();
    const activeClients = await this.clientRepository.count({
      where: { estado: 'Envío Activo' },
    });

    // Stats for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const jobsToday = await this.sendJobRepository
      .createQueryBuilder('job')
      .where('DATE(job.scheduled_date) = DATE(:date)', { date: today })
      .getCount();

    const emailsSentToday = await this.emailSendRepository
      .createQueryBuilder('email')
      .where('DATE(email.sent_at) = DATE(:date)', { date: today })
      .andWhere('email.status = :status', { status: 'sent' })
      .getCount();

    return {
      totalClients,
      activeClients,
      jobsToday,
      emailsSentToday,
    };
  }

  async getRecentJobs() {
    return this.sendJobRepository.find({
      order: { scheduledDate: 'DESC' },
      take: 10,
      relations: ['client'],
    });
  }
}
