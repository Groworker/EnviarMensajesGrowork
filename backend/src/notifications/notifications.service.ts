import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    Notification,
    NotificationType,
    NotificationSeverity,
} from './entities/notification.entity';

export interface CreateNotificationDto {
    type: NotificationType;
    title: string;
    message?: string;
    severity?: NotificationSeverity;
    relatedClientId?: number;
    relatedWorkflow?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
    ) { }

    async create(dto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationsRepository.create({
            type: dto.type,
            title: dto.title,
            message: dto.message,
            severity: dto.severity || NotificationSeverity.INFO,
            relatedClientId: dto.relatedClientId,
            relatedWorkflow: dto.relatedWorkflow,
            metadata: dto.metadata,
            isRead: false,
        });

        return this.notificationsRepository.save(notification);
    }

    async findAll(limit = 50, offset = 0): Promise<Notification[]> {
        return this.notificationsRepository.createQueryBuilder('notification')
            .leftJoinAndSelect('notification.relatedClient', 'client')
            .orderBy('notification.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();
    }

    async findUnread(): Promise<Notification[]> {
        return this.notificationsRepository.createQueryBuilder('notification')
            .leftJoinAndSelect('notification.relatedClient', 'client')
            .where('notification.isRead = :isRead', { isRead: false })
            .orderBy('notification.createdAt', 'DESC')
            .getMany();
    }

    async countUnread(): Promise<number> {
        return this.notificationsRepository.count({
            where: { isRead: false },
        });
    }

    async markAsRead(id: number): Promise<Notification | null> {
        await this.notificationsRepository.update(id, { isRead: true });
        return this.notificationsRepository.findOne({ where: { id } });
    }

    async markAllAsRead(): Promise<void> {
        await this.notificationsRepository.update({ isRead: false }, { isRead: true });
    }

    async delete(id: number): Promise<void> {
        await this.notificationsRepository.delete(id);
    }

    // Helper methods for creating specific notification types
    async notifyClientAutoDeleted(
        clientId: number,
        clientName: string,
        reason: string,
    ): Promise<Notification> {
        return this.create({
            type: NotificationType.CLIENT_AUTO_DELETED,
            title: `Cliente eliminado automáticamente: ${clientName}`,
            message: reason,
            severity: NotificationSeverity.INFO,
            relatedClientId: clientId,
            metadata: { reason },
        });
    }

    async notifyWorkflowEvent(
        workflowId: string,
        title: string,
        message: string,
        clientId?: number,
        metadata?: Record<string, any>,
    ): Promise<Notification> {
        const typeMap: Record<string, NotificationType> = {
            'BuL088npiVZ6gak7': NotificationType.WORKFLOW_WKF1,
            'Ze3INzogY594XOCg': NotificationType.WORKFLOW_WKF1_1,
            'Ajfl4VnlJbPlA03E': NotificationType.WORKFLOW_WKF1_2,
            'EoSIHDe8HPHQrUWT': NotificationType.WORKFLOW_WKF1_3,
            '49XoEhgqjyRt3LSg': NotificationType.WORKFLOW_WKF4,
        };

        return this.create({
            type: typeMap[workflowId] || NotificationType.SYSTEM,
            title,
            message,
            severity: NotificationSeverity.SUCCESS,
            relatedClientId: clientId,
            relatedWorkflow: workflowId,
            metadata,
        });
    }
}
