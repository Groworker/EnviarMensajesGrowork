import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';

export enum SendJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

@Entity('send_jobs')
export class SendJob {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: number;

  @CreateDateColumn({ name: 'scheduled_date' })
  scheduledDate: Date; // The date this job is for (e.g. today)

  @Column({
    type: 'enum',
    enum: SendJobStatus,
    default: SendJobStatus.QUEUED,
  })
  status: SendJobStatus;

  @Column({ name: 'emails_to_send', default: 0 })
  emailsToSend: number; // Target count for this job

  @Column({ name: 'emails_sent_count', default: 0 })
  emailsSentCount: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;
}
