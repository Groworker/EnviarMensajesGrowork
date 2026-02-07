import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { EmailSend } from '../entities/email-send.entity';
import { Notification } from '../notifications/entities/notification.entity';

export interface PipelineStats {
    estado: string;
    count: number;
    percentage: number;
}

export interface EmailStats {
    totalSent: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    byDay: Array<{ date: string; sent: number; success: number; failed: number }>;
}

export interface KPIData {
    activeClients: number;
    totalEmailsSent: number;
    emailSuccessRate: number;
    unreadNotifications: number;
    recentDeletions: number;
}

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Client)
        private clientsRepository: Repository<Client>,
        @InjectRepository(EmailSend)
        private emailSendsRepository: Repository<EmailSend>,
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

    /**
     * Get client pipeline statistics (breakdown by estado)
     */
    async getClientPipeline(): Promise<PipelineStats[]> {
        const activeClients = await this.clientsRepository
            .createQueryBuilder('client')
            .select('client.estado', 'estado')
            .addSelect('COUNT(client.id)', 'count')
            .where('client.deleted_at IS NULL')
            .groupBy('client.estado')
            .getRawMany();

        const total = activeClients.reduce((sum, item) => sum + parseInt(item.count), 0);

        return activeClients.map((item) => ({
            estado: item.estado || 'Sin estado',
            count: parseInt(item.count),
            percentage: total > 0 ? (parseInt(item.count) / total) * 100 : 0,
        }));
    }

    /**
     * Get email statistics for the last 30 days
     */
    async getEmailStats(days = 30): Promise<EmailStats> {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const allEmails = await this.emailSendsRepository
            .createQueryBuilder('email')
            .where('email.sent_at >= :sinceDate', { sinceDate })
            .getMany();

        const totalSent = allEmails.length;
        const successCount = allEmails.filter((e) => e.status === 'sent').length;
        const failureCount = allEmails.filter((e) => ['failed', 'bounced'].includes(e.status)).length;
        const successRate = totalSent > 0 ? (successCount / totalSent) * 100 : 0;

        // Group by day
        const byDayMap = new Map<string, { sent: number; success: number; failed: number }>();

        allEmails.forEach((email) => {
            const dateKey = email.sentAt?.toISOString().split('T')[0] || 'unknown';
            const existing = byDayMap.get(dateKey) || { sent: 0, success: 0, failed: 0 };

            existing.sent += 1;
            if (email.status === 'sent') {
                existing.success += 1;
            } else if (['failed', 'bounced'].includes(email.status)) {
                existing.failed += 1;
            }

            byDayMap.set(dateKey, existing);
        });

        const byDay = Array.from(byDayMap.entries())
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalSent,
            successCount,
            failureCount,
            successRate,
            byDay,
        };
    }

    /**
     * Get recent activity (emails + notifications)
     */
    async getRecentActivity(limit = 20): Promise<any[]> {
        // Get recent emails
        const recentEmails = await this.emailSendsRepository.find({
            relations: ['client'],
            order: { sentAt: 'DESC' },
            take: limit,
        });

        // Get recent notifications
        const recentNotifications = await this.notificationsRepository.find({
            relations: ['relatedClient'],
            order: { createdAt: 'DESC' },
            take: limit,
        });

        // Combine and sort by timestamp
        const activities = [
            ...recentEmails.map((e) => ({
                type: 'email',
                timestamp: e.sentAt,
                success: e.status === 'sent',
                client: e.client,
                id: e.id,
            })),
            ...recentNotifications.map((n) => ({
                type: 'notification',
                timestamp: n.createdAt,
                title: n.title,
                severity: n.severity,
                client: n.relatedClient,
                id: n.id,
            })),
        ];

        return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    /**
     * Get KPI data for dashboard cards
     */
    async getKPIs(): Promise<KPIData> {
        // Active clients (not deleted)
        const activeClients = await this.clientsRepository
            .createQueryBuilder('client')
            .where('client.deleted_at IS NULL')
            .getCount();

        // Total emails sent (last 30 days)
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 30);
        const totalEmailsSent = await this.emailSendsRepository
            .createQueryBuilder('email')
            .where('email.sent_at >= :sinceDate', { sinceDate })
            .getCount();

        // Email success rate (last 30 days)
        const successfulEmails = await this.emailSendsRepository
            .createQueryBuilder('email')
            .where('email.sent_at >= :sinceDate', { sinceDate })
            .andWhere('email.status = :status', { status: 'sent' })
            .getCount();
        const emailSuccessRate =
            totalEmailsSent > 0 ? (successfulEmails / totalEmailsSent) * 100 : 0;

        // Unread notifications
        const unreadNotifications = await this.notificationsRepository.count({
            where: { isRead: false },
        });

        // Recent deletions (placeholder - DeletionLog entity not implemented yet)
        const recentDeletions = 0;

        return {
            activeClients,
            totalEmailsSent,
            emailSuccessRate,
            unreadNotifications,
            recentDeletions,
        };
    }

    /**
     * Get clients eligible for deletion (preview)
     */
    async getEligibleForDeletion(): Promise<Client[]> {
        const now = new Date();
        const closedThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const emailThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const query = this.clientsRepository
            .createQueryBuilder('client')
            .where('client.deleted_at IS NULL')
            .andWhere(
                '(client.estado = :estado AND client.estado_changed_at < :closedThreshold) OR (client.last_email_sent_at < :emailThreshold)',
                {
                    estado: 'Cerrado',
                    closedThreshold,
                    emailThreshold,
                },
            )
            .take(50);

        return query.getMany();
    }
}
