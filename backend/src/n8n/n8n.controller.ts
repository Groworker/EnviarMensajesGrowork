import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Client } from '../entities/client.entity';

interface N8nWebhookPayload {
    workflowId: string;
    workflowName: string;
    event: string;
    clientId?: number;
    zohoId?: string;
    clientName?: string;
    data?: Record<string, any>;
    timestamp: string;
}

@Controller('n8n')
export class N8nController {
    private readonly logger = new Logger(N8nController.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        @InjectRepository(Client)
        private readonly clientsRepository: Repository<Client>,
    ) { }

    @Post('webhook')
    async handleWebhook(@Body() payload: N8nWebhookPayload) {
        this.logger.log(`Received n8n webhook: ${payload.workflowName} - ${payload.event}`);

        try {
            let clientId = payload.clientId;

            // If zohoId is provided but not clientId, lookup the client
            if (!clientId && payload.zohoId) {
                const client = await this.clientsRepository.findOne({
                    where: { zohoId: payload.zohoId },
                });
                if (client) {
                    clientId = client.id;
                    this.logger.log(`Resolved zohoId ${payload.zohoId} to clientId ${clientId}`);
                } else {
                    this.logger.warn(`Client not found for zohoId: ${payload.zohoId}`);
                }
            }

            // Map workflow IDs to notification types
            const typeMap: Record<string, NotificationType> = {
                'BuL088npiVZ6gak7': NotificationType.WORKFLOW_WKF1,
                'Ze3INzogY594XOCg': NotificationType.WORKFLOW_WKF1_1,
                'Ajfl4VnlJbPlA03E': NotificationType.WORKFLOW_WKF1_2,
                'EoSIHDe8HPHQrUWT': NotificationType.WORKFLOW_WKF1_3,
                '49XoEhgqjyRt3LSg': NotificationType.WORKFLOW_WKF4,
            };

            const notificationType = typeMap[payload.workflowId] || NotificationType.SYSTEM;

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
