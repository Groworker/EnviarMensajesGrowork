import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Client } from '../../entities/client.entity';

export enum NotificationType {
    WORKFLOW_WKF1 = 'workflow_wkf1',
    WORKFLOW_WKF1_1 = 'workflow_wkf1_1',
    WORKFLOW_WKF1_2 = 'workflow_wkf1_2',
    WORKFLOW_WKF1_3 = 'workflow_wkf1_3',
    WORKFLOW_WKF1_4 = 'workflow_wkf1_4',
    CLIENT_AUTO_DELETED = 'client_auto_deleted',
    CLIENT_MANUAL_DELETED = 'client_manual_deleted',
    EMAIL_SENT = 'email_sent',
    EMAIL_FAILED = 'email_failed',
    SYSTEM = 'system',
}

export enum NotificationSeverity {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType;

    @Column({ length: 255 })
    title: string;

    @Column('text', { nullable: true })
    message: string;

    @Column({
        type: 'enum',
        enum: NotificationSeverity,
        default: NotificationSeverity.INFO,
    })
    severity: NotificationSeverity;

    @Column({ name: 'related_client_id', nullable: true })
    relatedClientId: number;

    @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'related_client_id' })
    relatedClient: Client;

    @Column({ name: 'related_workflow', length: 100, nullable: true })
    relatedWorkflow: string;

    @Column('jsonb', { nullable: true })
    metadata: Record<string, any>;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @Column({ name: 'is_archived', default: false })
    isArchived: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
