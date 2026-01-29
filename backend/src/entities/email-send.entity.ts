import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Client } from './client.entity';
import { JobOffer } from './job-offer.entity';
import { SendJob } from './send-job.entity';

export enum EmailSendStatus {
  RESERVED = 'reserved', // Picked by a worker but not sent yet
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

@Entity('email_sends')
@Unique(['clientId', 'jobOfferId']) // Prevent sending same offer twice for same client
@Unique(['clientId', 'recipientEmail']) // Prevent sending to same email twice for same client (if business rule implies)
export class EmailSend {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => JobOffer)
  @JoinColumn({ name: 'job_offer_id' })
  jobOffer: JobOffer;

  @Column({ name: 'job_offer_id' })
  jobOfferId: number;

  @ManyToOne(() => SendJob)
  @JoinColumn({ name: 'send_job_id' })
  sendJob: SendJob;

  @Column({ name: 'send_job_id', nullable: true })
  sendJobId: number;

  @Column({ name: 'recipient_email' })
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: EmailSendStatus,
    default: EmailSendStatus.RESERVED,
  })
  status: EmailSendStatus;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @Column({ name: 'message_id', nullable: true })
  messageId: string; // From Gmail API

  @Column({ type: 'text', nullable: true })
  content_snapshot: string; // optional: save generated email
}
