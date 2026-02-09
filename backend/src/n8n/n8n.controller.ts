import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Client } from '../entities/client.entity';
import { WorkflowStateService } from '../workflow-state/workflow-state.service';
import {
    WorkflowType,
    WorkflowStatus,
} from '../entities/client-workflow-state.entity';

interface N8nWebhookPayload {
    workflowId: string;
    workflowName: string;
    event: string;
    clientId?: number;
    zohoId?: string;
    folderId?: string; // Google Drive folder ID for lookup
    clientName?: string;
    data?: Record<string, any>;
    timestamp: string;
    status?: 'success' | 'error';
    errorMessage?: string;
    executionUrl?: string;
}

@Controller('n8n')
export class N8nController {
    private readonly logger = new Logger(N8nController.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly workflowStateService: WorkflowStateService,
        @InjectRepository(Client)
        private readonly clientsRepository: Repository<Client>,
    ) { }

    @Post('webhook')
    async handleWebhook(@Body() payload: N8nWebhookPayload) {
        this.logger.log(`Received n8n webhook: ${payload.workflowName} - ${payload.event}`);

        try {
            let clientId = payload.clientId;

            // Support alternative field names from n8n
            const zohoId = payload.zohoId || (payload as any).id_contacto;
            const clientName = payload.clientName || (payload as any).cliente;

            // If zohoId is provided but not clientId, lookup the client
            if (!clientId && zohoId) {
                let client = await this.clientsRepository.findOne({
                    where: { zohoId },
                });

                if (client) {
                    clientId = client.id;
                    this.logger.log(`Resolved zohoId ${zohoId} to clientId ${clientId}`);
                } else {
                    // Client doesn't exist yet - create it automatically
                    // This can happen when WKF-1 executes before WKF-4
                    this.logger.log(`Client not found for zohoId ${zohoId}, creating basic client record`);

                    try {
                        const newClient = this.clientsRepository.create({
                            zohoId,
                            nombre: clientName?.split(' ')[0] || '',
                            apellido: clientName?.split(' ').slice(1).join(' ') || '',
                            emailOperativo: payload.data?.email || null,
                            idCarpetaCliente: payload.data?.carpetaCliente || null,
                            idCarpetaCv: payload.data?.carpetaCV || null,
                            idCarpetaOld: payload.data?.carpetaOLD || null,
                            idCarpetaNew: payload.data?.carpetaNEW || null,
                            idCarpetaDefinitiva: payload.data?.carpetaDEFINITIVA || null,
                        });
                        const savedClient = await this.clientsRepository.save(newClient);
                        client = savedClient;
                        clientId = savedClient.id;
                        this.logger.log(`Created new client with ID ${clientId} for zohoId ${zohoId}`);

                        // Initialize workflow states for the new client
                        await this.workflowStateService.initializeClientStates(clientId);
                        this.logger.log(`Initialized workflow states for client ${clientId}`);
                    } catch (createError: any) {
                        this.logger.error(`Failed to create client for zohoId ${zohoId}: ${createError.message}`);
                        // Continue without clientId - the notification will still be created but won't be associated with a client
                    }
                }
            }

            // If folderId is provided but not clientId (for WKF-1.2), lookup by folder ID
            if (!clientId && payload.folderId) {
                const client = await this.clientsRepository.findOne({
                    where: { idCarpetaCliente: payload.folderId },
                });

                if (client) {
                    clientId = client.id;
                    this.logger.log(`Resolved folderId ${payload.folderId} to clientId ${clientId}`);
                } else {
                    this.logger.warn(`No client found for folderId ${payload.folderId}`);
                }
            }

            // Map workflow IDs to notification types and workflow types
            const typeMap: Record<string, NotificationType> = {
                'BuL088npiVZ6gak7': NotificationType.WORKFLOW_WKF1, // Old ID
                'AMtg259bLLwhgbUL': NotificationType.WORKFLOW_WKF1, // New ID
                'Ze3INzogY594XOCg': NotificationType.WORKFLOW_WKF1_1, // Old ID
                'xCcVhFUwAmDJ4JOT': NotificationType.WORKFLOW_WKF1_1, // New ID
                'Ajfl4VnlJbPlA03E': NotificationType.WORKFLOW_WKF1_2, // Old ID
                'beNsoQ2JZOdtusf2': NotificationType.WORKFLOW_WKF1_2, // New ID
                'EoSIHDe8HPHQrUWT': NotificationType.WORKFLOW_WKF1_3,
                '49XoEhgqjyRt3LSg': NotificationType.WORKFLOW_WKF4, // Old ID
                'ItDz2wWOVJbusbXV': NotificationType.WORKFLOW_WKF4, // New ID
            };

            const workflowTypeMap: Record<string, WorkflowType> = {
                'BuL088npiVZ6gak7': WorkflowType.WKF_1, // Old ID
                'AMtg259bLLwhgbUL': WorkflowType.WKF_1, // New ID
                'Ze3INzogY594XOCg': WorkflowType.WKF_1_1, // Old ID
                'xCcVhFUwAmDJ4JOT': WorkflowType.WKF_1_1, // New ID
                'Ajfl4VnlJbPlA03E': WorkflowType.WKF_1_2, // Old ID
                'beNsoQ2JZOdtusf2': WorkflowType.WKF_1_2, // New ID
                'EoSIHDe8HPHQrUWT': WorkflowType.WKF_1_3,
                '49XoEhgqjyRt3LSg': WorkflowType.WKF_4, // Old ID
                'ItDz2wWOVJbusbXV': WorkflowType.WKF_4, // New ID
            };

            const notificationType = typeMap[payload.workflowId] || NotificationType.SYSTEM;
            const workflowType = workflowTypeMap[payload.workflowId];

            // Create notification
            await this.notificationsService.notifyWorkflowEvent(
                payload.workflowId,
                payload.workflowName,
                this.buildMessage(payload),
                clientId,
                {
                    event: payload.event,
                    zohoId: payload.zohoId,
                    ...payload.data,
                },
            );

            this.logger.log(`Notification created for workflow ${payload.workflowId}`);

            // Update workflow state if clientId and workflowType are available
            if (clientId && workflowType) {
                const status = payload.status === 'error' ? WorkflowStatus.ERROR : WorkflowStatus.OK;

                await this.workflowStateService.updateWorkflowState(clientId, {
                    workflowType,
                    status,
                    executionUrl: payload.executionUrl,
                    errorMessage: payload.errorMessage,
                    metadata: {
                        event: payload.event,
                        timestamp: payload.timestamp,
                        ...payload.data,
                    },
                });

                this.logger.log(`Updated workflow state for client ${clientId}: ${workflowType} -> ${status}`);
            } else {
                this.logger.warn(
                    `Could not update workflow state: clientId=${clientId}, workflowType=${workflowType}`,
                );
            }

            return {
                success: true,
                message: 'Webhook processed successfully',
                clientId,
            };
        } catch (error) {
            this.logger.error(`Error processing n8n webhook: ${error.message}`);
            throw error;
        }
    }

    private buildMessage(payload: N8nWebhookPayload): string {
        const messages: Record<string, (p: N8nWebhookPayload) => string> = {
            'carpetas_y_cv_creados': (p) =>
                `Se han generado correctamente las carpetas en Google Drive y la estructura del CV para el cliente.`,
            'creador_asignado': (p) =>
                `Las carpetas del cliente en Google Drive han sido compartidas correctamente con el creador de CV asignado (${p.data?.creador_nombre}). A partir de este momento, podrá acceder a los archivos y comenzar el proceso.`,
            'nuevo_archivo_detectado': (p) =>
                `Se ha detectado un nuevo archivo "${p.data?.archivo_nombre}" en la carpeta NEW. El sistema procederá a procesarlo.`,
            'cv_movido_a_definitiva': (p) =>
                `El CV final "${p.data?.cv_archivo_nombre}" ha sido aprobado y movido a la carpeta DEFINITIVA.`,
            'email_corporativo_creado': (p) =>
                `Se ha configurado con éxito la cuenta de correo corporativo ${p.data?.email_operativo}. Las credenciales han sido guardadas.`,
        };

        const messageBuilder = messages[payload.event];
        return messageBuilder ? messageBuilder(payload) : `Evento ${payload.event} ejecutado para ${payload.clientName || 'cliente'}`;
    }
}
