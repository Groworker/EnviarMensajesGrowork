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

    constructor(
        @InjectRepository(Client)
        private readonly clientsRepository: Repository<Client>,
        @InjectRepository(DeletionLog)
        private readonly deletionLogsRepository: Repository<DeletionLog>,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Cron job that runs daily at 2 AM to check and delete eligible clients
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleAutoDeletion() {
        this.logger.log('Running automatic client deletion check...');

        try {
            const eligibleClients = await this.findEligibleForDeletion();

            this.logger.log(`Found ${eligibleClients.length} clients eligible for deletion`);

            for (const client of eligibleClients) {
                await this.deleteClient(client.id, {
                    reason: client.deletionReason,
                    isAutomatic: true,
                });
            }

            this.logger.log(`Auto-deletion complete. Deleted ${eligibleClients.length} clients.`);
        } catch (error) {
            this.logger.error(`Error during auto-deletion: ${error.message}`, error.stack);
        }
    }

    /**
     * Find clients eligible for automatic deletion based on business rules
     */
    async findEligibleForDeletion(): Promise<Array<Client & { deletionReason: string }>> {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Find clients in "Cerrado" state for more than 7 days
        const closedClients = await this.clientsRepository
            .createQueryBuilder('client')
            .where('client.estado = :estado', { estado: 'Cerrado' })
            .andWhere('client.estadoChangedAt <= :sevenDaysAgo', { sevenDaysAgo })
            .andWhere('client.deletedAt IS NULL')
            .getMany();

        // Find clients with no emails sent in the last 14 days
        const inactiveClients = await this.clientsRepository
            .createQueryBuilder('client')
            .where('client.lastEmailSentAt <= :fourteenDaysAgo', { fourteenDaysAgo })
            .orWhere('client.lastEmailSentAt IS NULL')
            .andWhere('client.createdAt <= :fourteenDaysAgo', { fourteenDaysAgo })
            .andWhere('client.deletedAt IS NULL')
            .andWhere('client.estado != :estado', { estado: 'Cerrado' }) // Don't duplicate closed clients
            .getMany();

        // Combine and add deletion reasons
        const eligible = [
            ...closedClients.map(c => ({
                ...c,
                deletionReason: 'Cliente cerrado por más de 7 días'
            })),
            ...inactiveClients.map(c => ({
                ...c,
                deletionReason: 'Sin actividad de emails por más de 14 días'
            }))
        ];

        return eligible;
    }

    /**
     * Delete a client (soft delete) and create audit log
     */
    async deleteClient(
        clientId: number,
        options: {
            reason?: string;
            isAutomatic?: boolean;
            deletedBy?: string;
        } = {}
    ): Promise<void> {
        const client = await this.clientsRepository.findOne({
            where: { id: clientId }
        });

        if (!client) {
            throw new Error(`Client with ID ${clientId} not found`);
        }

        if (client.deletedAt) {
            throw new Error(`Client with ID ${clientId} is already deleted`);
        }

        const { reason: deletionReason, isAutomatic = false, deletedBy } = options;

        // Calculate metrics
        const now = new Date();
        let daysSinceClosed: number | null = null;
        let daysSinceLastEmail: number | null = null;

        if (client.estado === 'Cerrado' && client.estadoChangedAt) {
            const diff = now.getTime() - client.estadoChangedAt.getTime();
            daysSinceClosed = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        if (client.lastEmailSentAt) {
            const diff = now.getTime() - client.lastEmailSentAt.getTime();
            daysSinceLastEmail = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        // Soft delete the client
        client.deletedAt = now;
        client.deletionReason = deletionReason || 'Eliminación automática';
        await this.clientsRepository.save(client);

        // Create deletion log - Create entity instance properly
        const deletionLog = new DeletionLog();
        deletionLog.clientId = client.id;
        deletionLog.clientName = `${client.nombre || ''} ${client.apellido || ''}`.trim();
        deletionLog.clientEmail = client.email;
        deletionLog.deletionReason = deletionReason || '';
        deletionLog.wasAutomatic = isAutomatic;
        deletionLog.daysSinceClosed = daysSinceClosed ?? 0;
        deletionLog.daysSinceLastEmail = daysSinceLastEmail ?? 0;
        deletionLog.deletedBy = deletedBy || (isAutomatic ? 'SYSTEM' : 'MANUAL');

        await this.deletionLogsRepository.save(deletionLog);

        // Create notification
        await this.notificationsService.notifyClientAutoDeleted(
            client.id,
            `${client.nombre || ''} ${client.apellido || ''}`.trim(),
            deletionReason || 'Eliminación automática',
        );

        this.logger.log(
            `Client ${clientId} deleted. Reason: ${deletionReason}. Auto: ${isAutomatic}`
        );
    }

    /**
     * Get deletion statistics
     */
    async getDeletionStats(days = 30): Promise<{
        totalDeleted: number;
        automaticDeleted: number;
        manualDeleted: number;
        recentDeletions: DeletionLog[];
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const allDeletions = await this.deletionLogsRepository.find({
            where: {
                deletedAt: LessThan(new Date()), // All deletions up to now
            },
            order: {
                deletedAt: 'DESC',
            },
            take: 10,
        });

        const totalDeleted = allDeletions.length;
        const automaticDeleted = allDeletions.filter(d => d.wasAutomatic).length;

        return {
            totalDeleted,
            automaticDeleted,
            manualDeleted: totalDeleted - automaticDeleted,
            recentDeletions: allDeletions.slice(0, 5),
        };
    }

    /**
     * Restore a deleted client
     */
    async restoreClient(clientId: number): Promise<void> {
        const client = await this.clientsRepository.findOne({
            where: { id: clientId },
            withDeleted: true,
        });

        if (!client) {
            throw new Error(`Client with ID ${clientId} not found`);
        }

        if (!client.deletedAt) {
            throw new Error(`Client with ID ${clientId} is not deleted`);
        }

        client.deletedAt = null;
        client.deletionReason = null;
        await this.clientsRepository.save(client);

        this.logger.log(`Client ${clientId} restored`);
    }
}
