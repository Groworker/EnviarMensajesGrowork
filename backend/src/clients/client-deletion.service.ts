import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from '../entities/client.entity';
import { DeletionLog } from './entities/deletion-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClientDeletionService {
    private readonly logger = new Logger(ClientDeletionService.name);

    // Thresholds in days
    private readonly DAYS_CLOSED_THRESHOLD = 7;
    private readonly DAYS_NO_EMAILS_THRESHOLD = 14;

    constructor(
        @InjectRepository(Client)
        private clientsRepository: Repository<Client>,
        @InjectRepository(DeletionLog)
        private deletionLogsRepository: Repository<DeletionLog>,
        private notificationsService: NotificationsService,
    ) { }

    /**
     * Runs daily at 3:00 AM to check and delete eligible clients
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleAutoDeletion() {
        this.logger.log('Starting automatic client deletion check...');

        try {
            const eligibleClients = await this.findEligibleForDeletion();
            this.logger.log(`Found ${eligibleClients.length} clients eligible for deletion`);

            let deletedCount = 0;
            for (const client of eligibleClients) {
                try {
                    await this.deleteClient(client.id, true);
                    deletedCount++;
                } catch (error) {
                    this.logger.error(
                        `Failed to delete client ${client.id}: ${error.message}`,
                    );
                }
            }

            this.logger.log(
                `Automatic deletion completed. Deleted ${deletedCount}/${eligibleClients.length} clients`,
            );
        } catch (error) {
            this.logger.error(`Auto-deletion job failed: ${error.message}`);
        }
    }

    /**
     * Find clients eligible for automatic deletion based on business rules:
     * - Estado "Cerrado" for >= 7 days, OR
     * - No emails sent in >= 14 days
     */
    async findEligibleForDeletion(): Promise<Client[]> {
        const now = new Date();
        const closedThreshold = new Date(
            now.getTime() - this.DAYS_CLOSED_THRESHOLD * 24 * 60 * 60 * 1000,
        );
        const emailThreshold = new Date(
            now.getTime() - this.DAYS_NO_EMAILS_THRESHOLD * 24 * 60 * 60 * 1000,
        );

        // Find clients that are "Cerrado" for >= 7 days
        const closedClients = await this.clientsRepository.find({
            where: {
                estado: 'Cerrado',
                estadoChangedAt: LessThan(closedThreshold),
                deletedAt: IsNull(),
            },
        });

        // Find clients with no emails sent in >= 14 days
        const inactiveClients = await this.clientsRepository.find({
            where: {
                lastEmailSentAt: LessThan(emailThreshold),
                deletedAt: IsNull(),
            },
        });

        // Combine and deduplicate by ID
        const allEligible = [...closedClients, ...inactiveClients];
        const uniqueClients = Array.from(
            new Map(allEligible.map((c) => [c.id, c])).values(),
        );

        return uniqueClients;
    }

    /**
     * Delete a client (soft delete) and create an audit log
     */
    async deleteClient(
        clientId: number,
        isAutomatic = false,
        reason?: string,
        deletedBy?: string,
    ): Promise<void> {
        const client = await this.clientsRepository.findOne({
            where: { id: clientId },
        });

        if (!client) {
            throw new Error(`Client with ID ${clientId} not found`);
        }

        if (client.deletedAt) {
            throw new Error(`Client with ID ${clientId} is already deleted`);
        }

        // Calculate days since closed and last email
        const now = new Date();
        let daysSinceClosed: number | null = null;
        let daysSinceLastEmail: number | null = null;

        if (client.estadoChangedAt && client.estado === 'Cerrado') {
            daysSinceClosed = Math.floor(
                (now.getTime() - client.estadoChangedAt.getTime()) /
                (24 * 60 * 60 * 1000),
            );
        }

        if (client.lastEmailSentAt) {
            daysSinceLastEmail = Math.floor(
                (now.getTime() - client.lastEmailSentAt.getTime()) /
                (24 * 60 * 60 * 1000),
            );
        }

        // Generate automatic deletion reason
        let deletionReason = reason;
        if (isAutomatic && !deletionReason) {
            const reasons: string[] = [];
            if (daysSinceClosed && daysSinceClosed >= this.DAYS_CLOSED_THRESHOLD) {
                reasons.push(`Estado "Cerrado" durante ${daysSinceClosed} días`);
            }
            if (
                daysSinceLastEmail &&
                daysSinceLastEmail >= this.DAYS_NO_EMAILS_THRESHOLD
            ) {
                reasons.push(`Sin emails enviados durante ${daysSinceLastEmail} días`);
            }
            deletionReason = reasons.join(', ');
        }

        // Soft delete the client
        client.deletedAt = now;
        client.deletionReason = deletionReason || 'Eliminación automática';
        await this.clientsRepository.save(client);

        // Create deletion log
        const deletionLog = this.deletionLogsRepository.create({
            clientId: client.id,
            clientName: `${client.nombre || ''} ${client.apellido || ''}`.trim(),
            clientEmail: client.email,
            deletionReason,
            wasAutomatic: isAutomatic,
            daysSinceClosed,
            daysSinceLastEmail,
            deletedBy: deletedBy || (isAutomatic ? 'SYSTEM' : null),
            deletedAt: now,
        });
        await this.deletionLogsRepository.save(deletionLog);

        // Create notification
        await this.notificationsService.notifyClientAutoDeleted(
            client.id,
            `${client.nombre || ''} ${client.apellido || ''}`.trim(),
            deletionReason || 'Eliminación automática',
        );

        this.logger.log(
            `Client ${client.id} (${client.nombre} ${client.apellido}) deleted. Automatic: ${isAutomatic}`,
        );
    }

    /**
     * Get deletion statistics
     */
    async getDeletionStats(): Promise<{
        totalDeleted: number;
        automaticDeleted: number;
        manualDeleted: number;
        recentDeletions: DeletionLog[];
    }> {
        const totalDeleted = await this.deletionLogsRepository.count();
        const automaticDeleted = await this.deletionLogsRepository.count({
            where: { wasAutomatic: true },
        });
        const manualDeleted = await this.deletionLogsRepository.count({
            where: { wasAutomatic: false },
        });

        const recentDeletions = await this.deletionLogsRepository.find({
            order: { deletedAt: 'DESC' },
            take: 10,
        });

        return {
            totalDeleted,
            automaticDeleted,
            manualDeleted,
            recentDeletions,
        };
    }
}
