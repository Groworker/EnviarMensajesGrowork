import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Client } from './client.entity';

export enum WorkflowType {
  WKF_1 = 'WKF-1',
  WKF_1_1 = 'WKF-1.1',
  WKF_1_2 = 'WKF-1.2',
  WKF_1_3 = 'WKF-1.3',
  WKF_1_4 = 'WKF-1.4',
}

export enum WorkflowStatus {
  PENDING = 'PENDING',
  OK = 'OK',
  ERROR = 'ERROR',
}

@Entity('client_workflow_states')
@Index(['clientId', 'workflowType'], { unique: true })
export class ClientWorkflowState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  clientId: number;

  @Column({
    type: 'enum',
    enum: WorkflowType,
  })
  @Index()
  workflowType: WorkflowType;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.PENDING,
  })
  status: WorkflowStatus;

  @Column({ nullable: true })
  executionUrl: string;

  @Column({ nullable: true })
  executedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
