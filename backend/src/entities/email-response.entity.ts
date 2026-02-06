import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { EmailSend } from './email-send.entity';

export enum ResponseClassification {
  NEGATIVA = 'negativa', // Rechazo explícito
  AUTOMATICA = 'automatica', // Respuesta automática/fuera de oficina
  ENTREVISTA = 'entrevista', // Conceden entrevista
  MAS_INFORMACION = 'mas_informacion', // Piden más información
  CONTRATADO = 'contratado', // Contratación confirmada
  SIN_CLASIFICAR = 'sin_clasificar', // Pendiente de clasificar
}

@Entity('email_responses')
export class EmailResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EmailSend, (emailSend) => emailSend.responses)
  @JoinColumn({ name: 'email_send_id' })
  emailSend: EmailSend;

  @Column({ name: 'email_send_id' })
  emailSendId: number;

  @Column({ name: 'gmail_message_id', unique: true })
  gmailMessageId: string;

  @Column({ name: 'gmail_thread_id' })
  gmailThreadId: string;

  @Column({ name: 'in_reply_to', nullable: true, length: 500 })
  inReplyTo: string;

  @Column({ name: 'references_header', type: 'text', nullable: true })
  referencesHeader: string;

  @Column({ name: 'from_email' })
  fromEmail: string;

  @Column({ name: 'from_name', nullable: true })
  fromName: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText: string;

  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml: string;

  @Column({
    type: 'enum',
    enum: ResponseClassification,
    default: ResponseClassification.SIN_CLASIFICAR,
  })
  classification: ResponseClassification;

  @Column({
    name: 'classification_confidence',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  classificationConfidence: number;

  @Column({ name: 'classification_reasoning', type: 'text', nullable: true })
  classificationReasoning: string;

  @Column({ name: 'classified_at', type: 'timestamp', nullable: true })
  classifiedAt: Date;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'received_at', type: 'timestamp' })
  receivedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
