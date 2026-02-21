import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Client } from '../entities/client.entity.js';
import { Dominio } from '../entities/dominio.entity.js';
import { GoogleWorkspaceService } from '../google-workspace/google-workspace.service.js';
import { EmailSend, EmailSendStatus } from '../entities/email-send.entity.js';

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
        // Get managed domains from DB
        const managedDomains = await this.dominioRepository.find();
        const domainNames = managedDomains.map(d => d.dominio);

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

        // Only include emails belonging to managed domains (e.g. personalwork.es)
        // Exclude personal emails like @gmail.com
        return clients
            .filter((client) => {
                const domain = client.emailOperativo?.split('@')[1];
                return domain && domainNames.includes(domain);
            })
            .map((client) => ({
                ...client,
                domain: client.emailOperativo?.split('@')[1] || 'Unknown',
            }));
    }

    async getStats() {
        const allEmails = await this.getAllCorporateEmails();
        const activeEmails = allEmails.filter((c) => !c.emailDeletionPendingSince);
        const pendingDeletion = allEmails.filter(
            (c) => c.emailDeletionPendingSince,
        );

        const byDomain = allEmails.reduce(
            (acc, client) => {
                const domain = client.domain;
                acc[domain] = (acc[domain] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        return {
            total: allEmails.length,
            active: activeEmails.length,
            pending: pendingDeletion.length,
            domains: byDomain,
        };
    }

    async getPendingDeletion() {
        const allEmails = await this.getAllCorporateEmails();
        return allEmails.filter((c) => c.emailDeletionPendingSince);
    }

    async deleteEmail(email: string) {
        this.logger.log(`Manual request to delete corporate email: ${email}`);

        // Process Google Workspace deletion
        try {
            await this.googleWorkspaceService.deleteUser(email);
        } catch (e: any) {
            if (e.message?.includes('User not found') || e.code === 404) {
                this.logger.warn(
                    `User ${email} not found in Google Workspace, proceeding to clean DB`,
                );
            } else {
                this.logger.error(
                    `Error deleting user ${email} from Google Workspace`,
                    e.stack,
                );
                throw e;
            }
        }

        // Clean DB
        const client = await this.clientRepository.findOne({
            where: { emailOperativo: email },
        });
        if (client) {
            client.emailOperativo = null as any;
            client.emailOperativoPw = null as any;
            client.fechaCreacionEmailOperativo = null as any;
            client.emailDeletionPendingSince = null;
            client.emailDeletionReason = null;
            await this.clientRepository.save(client);
            this.logger.log(`Cleaned up DB for client ID ${client.id}`);
        }
    }

    async cancelDeletion(email: string) {
        const client = await this.clientRepository.findOne({
            where: { emailOperativo: email },
        });
        if (client && client.emailDeletionPendingSince) {
            client.emailDeletionPendingSince = null;
            client.emailDeletionReason = null;
            await this.clientRepository.save(client);
            this.logger.log(`Cancelled deletion for email ${email}`);
        }
    }

    /**
     * Sync DB with Google Workspace reality.
     * Lists actual GW users and removes stale emails from the DB.
     */
    async syncWithGoogleWorkspace(): Promise<{
        gwUsers: string[];
        staleEmails: string[];
        nonManagedEmails: string[];
        cleaned: number;
    }> {
        // 1. Get all managed domains
        const managedDomains = await this.dominioRepository.find();
        const domainNames = managedDomains.map(d => d.dominio);

        // 2. Clean non-managed-domain emails (e.g. @gmail.com) from emailOperativo
        const allClientsWithEmail = await this.clientRepository.find({
            where: { emailOperativo: Not(IsNull()) },
        });

        const nonManagedClients = allClientsWithEmail.filter(client => {
            const domain = client.emailOperativo?.split('@')[1];
            return !domain || !domainNames.includes(domain);
        });

        const nonManagedEmails = nonManagedClients.map(c => c.emailOperativo!);
        if (nonManagedEmails.length > 0) {
            this.logger.log(`Found ${nonManagedEmails.length} non-managed domain emails to clean: ${nonManagedEmails.join(', ')}`);
            for (const client of nonManagedClients) {
                client.emailOperativo = null as any;
                client.emailOperativoPw = null as any;
                client.fechaCreacionEmailOperativo = null as any;
                client.emailDeletionPendingSince = null;
                client.emailDeletionReason = null;
                await this.clientRepository.save(client);
                this.logger.log(`Cleaned non-managed email for client ${client.id} (${client.nombre} ${client.apellido})`);
            }
        }

        // 3. List actual users in Google Workspace for each domain
        const gwEmails: string[] = [];
        for (const domain of domainNames) {
            try {
                const users = await this.googleWorkspaceService.listUsers(domain);
                for (const user of users) {
                    if (user.primaryEmail) {
                        gwEmails.push(user.primaryEmail.toLowerCase());
                    }
                }
            } catch (error: any) {
                this.logger.error(`Error listing GW users for domain ${domain}: ${error.message}`);
            }
        }

        this.logger.log(`Found ${gwEmails.length} actual users in Google Workspace: ${gwEmails.join(', ')}`);

        // 4. Find DB records with managed-domain emails that don't exist in GW
        const managedEmailClients = allClientsWithEmail.filter(client => {
            const domain = client.emailOperativo?.split('@')[1];
            return domain && domainNames.includes(domain);
        });

        const staleClients = managedEmailClients.filter(client => {
            return !gwEmails.includes(client.emailOperativo!.toLowerCase());
        });

        const staleEmails = staleClients.map(c => c.emailOperativo!);
        this.logger.log(`Found ${staleEmails.length} stale managed-domain emails in DB: ${staleEmails.join(', ')}`);

        // 5. Clean stale managed-domain emails from DB
        for (const client of staleClients) {
            client.emailOperativo = null as any;
            client.emailOperativoPw = null as any;
            client.fechaCreacionEmailOperativo = null as any;
            client.emailDeletionPendingSince = null;
            client.emailDeletionReason = null;
            await this.clientRepository.save(client);
            this.logger.log(`Cleaned stale email for client ${client.id} (${client.nombre} ${client.apellido})`);
        }

        return {
            gwUsers: gwEmails,
            staleEmails,
            nonManagedEmails,
            cleaned: staleClients.length + nonManagedClients.length,
        };
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
                emailDeletionPendingSince: IsNull(),
            },
        });

        for (const client of activeClients) {
            try {
                const deletionReason = await this.checkDeletionCriteria(client);

                if (deletionReason) {
                    client.emailDeletionPendingSince = new Date();
                    client.emailDeletionReason = deletionReason;
                    await this.clientRepository.save(client);
                    this.logger.log(
                        `Client ${client.id} (${client.emailOperativo}) marked for deletion. Reason: ${deletionReason}`,
                    );
                }
            } catch (error) {
                this.logger.error(
                    `Error checking deletion criteria for client ${client.id}`,
                    error,
                );
            }
        }
    }

    private async checkDeletionCriteria(
        client: Client,
    ): Promise<string | null> {
        // Condition 1: Closed in Zoho CRM for specific reasons
        const closedReasons = [
            'Contratad@',
            'Sin correos restantes',
            'Baja del Cliente',
            'Problemas Técnicos',
        ];

        if (
            client.estado === 'Closed' &&
            closedReasons.includes(client.motivoCierre || '')
        ) {
            return `Cuenta cerrada en Zoho CRM: ${client.motivoCierre}`;
        }

        // Condition 2: Inactivity (3 days)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const isOldEnough =
            client.fechaCreacionEmailOperativo &&
            client.fechaCreacionEmailOperativo < threeDaysAgo;
        const hasNoRecentEmails =
            !client.lastEmailSentAt || client.lastEmailSentAt < threeDaysAgo;

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
                sentAt: MoreThan(sevenDaysAgo),
            },
        });

        if (recentBouncesCount > 5) {
            return `Exceso de rebotes: ${recentBouncesCount} en los últimos 7 días`;
        }

        return null;
    }

    private async processExpiredGracePeriods() {
        const gracePeriodLimit = new Date();
        gracePeriodLimit.setHours(
            gracePeriodLimit.getHours() - this.GRACE_PERIOD_HOURS,
        );

        const pendingClients = await this.clientRepository.find({
            where: {
                emailOperativo: Not(IsNull()),
                emailDeletionPendingSince: LessThan(gracePeriodLimit),
            },
        });

        for (const client of pendingClients) {
            try {
                this.logger.log(
                    `Grace period expired for client ${client.id} (${client.emailOperativo}). Proceeding with auto-deletion.`,
                );
                if (client.emailOperativo) {
                    await this.deleteEmail(client.emailOperativo);
                }
            } catch (error) {
                this.logger.error(
                    `Error processing auto-deletion for client ${client.id}`,
                    error,
                );
            }
        }
    }
}
