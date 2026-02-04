import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('deletion_logs')
export class DeletionLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'client_id' })
    clientId: number;

    @Column({ name: 'client_name', length: 255 })
    clientName: string;

    @Column({ name: 'client_email', length: 255, nullable: true })
    clientEmail: string;

    @Column('text', { name: 'deletion_reason', nullable: true })
    deletionReason: string;

    @Column({ name: 'was_automatic', default: false })
    wasAutomatic: boolean;

    @Column({ name: 'days_since_closed', nullable: true })
    daysSinceClosed: number;

    @Column({ name: 'days_since_last_email', nullable: true })
    daysSinceLastEmail: number;

    @Column({ name: 'deleted_by', length: 100, nullable: true })
    deletedBy: string;

    @CreateDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
