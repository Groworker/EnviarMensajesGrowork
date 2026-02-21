import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from '../entities/client.entity';
import { Dominio } from '../entities/dominio.entity';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity';

@Injectable()
export class CorporateEmailsService {
    private readonly logger = new Logger(CorporateEmailsService.name);
    private readonly GRACE_PERIOD_HOURS = 48;

    constructor(
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
        @InjectRepository(Dominio)
        private dominioRepository: Repository<Dominio>,
        @InjectRepository(EmailSend)
        private emailSendRepository: Repository<EmailSend>,
        private googleWorkspaceService: GoogleWorkspaceService,
    ) { }

    async getAllCorporateEmails() {
        const clients = await this.clientRepository.find({
            where: { emailOperativo: Not(IsNull()) },
            select: [
                'id',
                'nombre',
                'apellido',
                'emailOperativo',
                'fechaCreacionEmailOperativo',
                'estado',
                'motivoCierre',
                'emailDeletionPendingSince',
                'emailDeletionReason',
            ],
            order: { fechaCreacionEmailOperativo: 'DESC' },
        });

        return clients.map(client => ({
            ...client,
            domain: client.emailOperativo?.split('@')[1] || 'Unknown',
        }));
    }

    async getStats() {
        const allEmails = await this.getAllCorporateEmails();
        const activeEmails = allEmails.filter(c => !c.emailDeletionPendingSince);
        const pendingDeletion = allEmails.filter(c => c.emailDeletionPendingSince);

        const byDomain = allEmails.reduce((acc, client) => {
            const domain = client.domain;
            acc[domain] = (acc[domain] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: allEmails.length,
            active: activeEmails.length,
            pending: pendingDeletion.length,
            domains: byDomain,
        };
    }

    async getPendingDeletion() {
        const allEmails = await this.getAllCorporateEmails();
        return allEmails.filter(c => c.emailDeletionPendingSince);
    }

    async deleteEmail(email: string) {
        this.logger.log(`Manual request to delete corporate email: ${email}`);

        // Process Google Workspace deletion
        try {
            await this.googleWorkspaceService.deleteUser(email);
        } catch (e: any) {
            if (e.message?.includes('User not found') || e.code === 404) {
                this.logger.warn(`User ${email} not found in Google Workspace, proceeding to clean DB`);
            } else {
                this.logger.error(`Error deleting user ${email} from Google Workspace`, e.stack);
                throw e;
            }
        }

        // Clean DB
        const client = await this.clientRepository.findOne({ where: { emailOperativo: email } });
        if (client) {
            client.emailOperativo = null;
            client.emailOperativoPw = null; // Removing the password for security
            client.fechaCreacionEmailOperativo = null;
            client.emailDeletionPendingSince = null;
            client.emailDeletionReason = null;
            await this.clientRepository.save(client);
            this.logger.log(`Cleaned up DB for client ID ${client.id}`);
        }
    }

    async cancelDeletion(email: string) {
        const client = await this.clientRepository.findOne({ where: { emailOperativo: email } });
        if (client && client.emailDeletionPendingSince) {
            client.emailDeletionPendingSince = null;
            client.emailDeletionReason = null;
            await this.clientRepository.save(client);
            this.logger.log(`Cancelled deletion for email ${email}`);
        }
    }

    // --- AUTO DELETION LOGIC (CRON) ---

    @Cron(CronExpression.EVERY_HOUR)
    async processAutoDeletion() {
        this.logger.log('Starting corporate email auto-deletion check...');

        // 1. Mark newly eligible accounts for deletion (entering grace period)
        await this.markEligibleAccountsForDeletion();

        // 2. Process accounts whose grace period has expired
        await this.processExpiredGracePeriods();

        this.logger.log('Finished corporate email auto-deletion check.');
    }

    private async markEligibleAccountsForDeletion() {
        const activeClients = await this.clientRepository.find({
            where: {
                emailOperativo: Not(IsNull()),
                emailDeletionPendingSince: IsNull() // Only those not already in grace period
            }
        });

        for (const client of activeClients) {
            try {
                const deletionReason = await this.checkDeletionCriteria(client);

                if (deletionReason) {
                    client.emailDeletionPendingSince = new Date();
                    client.emailDeletionReason = deletionReason;
                    await this.clientRepository.save(client);
                    this.logger.log(`Client ${client.id} (${client.emailOperativo}) marked for deletion. Reason: ${deletionReason}`);
                }
            } catch (error) {
                this.logger.error(`Error checking deletion criteria for client ${client.id}`, error);
            }
        }
    }

    private async checkDeletionCriteria(client: Client): Promise<string | null> {
        // Condition 1: Closed in Zoho CRM for specific reasons
        const closedReasons = ['Contratad@', 'Sin correos restantes', 'Baja del Cliente', 'Problemas Técnicos'];

        if (client.estado === 'Closed' && closedReasons.includes(client.motivoCierre || '')) {
            return `Cuenta cerrada en Zoho CRM: ${client.motivoCierre}`;
        }

        // Condition 2: Inactivity (3 days)
        // Checking lastEmailSentAt or if they never sent one but the account is > 3 days old
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const isOldEnough = client.fechaCreacionEmailOperativo && client.fechaCreacionEmailOperativo < threeDaysAgo;
        const hasNoRecentEmails = !client.lastEmailSentAt || client.lastEmailSentAt < threeDaysAgo;

        if (isOldEnough && hasNoRecentEmails) {
            return 'Inactividad prolongada (más de 3 días sin envíos)';
        }

        // Condition 3: Excessive Bounces (> 5 bounced in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentBouncesCount = await this.emailSendRepository.count({
            where: {
                clientId: client.id,
                status: EmailSendStatus.BOUNCED,
                sentAt: MoreThan(sevenDaysAgo)
            }
        });

        if (recentBouncesCount > 5) {
            return `Exceso de rebotes: ${recentBouncesCount} en los últimos 7 días`;
        }

        return null;
    }

    private async processExpiredGracePeriods() {
        const gracePeriodLimit = new Date();
        gracePeriodLimit.setHours(gracePeriodLimit.getHours() - this.GRACE_PERIOD_HOURS);

        const pendingClients = await this.clientRepository.find({
            where: {
                emailOperativo: Not(IsNull()),
                emailDeletionPendingSince: LessThan(gracePeriodLimit)
            }
        });

        for (const client of pendingClients) {
            try {
                this.logger.log(`Grace period expired for client ${client.id} (${client.emailOperativo}). Proceeding with auto-deletion.`);
                if (client.emailOperativo) {
                    await this.deleteEmail(client.emailOperativo);
                }
            } catch (error) {
                this.logger.error(`Error processing auto-deletion for client ${client.id}`, error);
            }
        }
    }
}
