import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

@Entity('global_send_config')
export class GlobalSendConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', default: 9, comment: 'Hour to start sending (0-23)' })
    startHour: number;

    @Column({ type: 'int', default: 18, comment: 'Hour to stop sending (0-23)' })
    endHour: number;

    @Column({
        type: 'int',
        default: 2,
        comment: 'Minimum delay in minutes between emails',
    })
    minDelayMinutes: number;

    @Column({
        type: 'int',
        default: 5,
        comment: 'Maximum delay in minutes between emails',
    })
    maxDelayMinutes: number;

    @Column({
        type: 'boolean',
        default: true,
        comment: 'Enable/disable time restrictions and delays',
    })
    enabled: boolean;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
