import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import type { MatchingCriteria } from '../types/client.types';

@Entity('client_send_settings')
export class ClientSendSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Client, (client) => client.sendSettings)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'min_daily_emails', default: 2 })
  minDailyEmails: number;

  @Column({ name: 'max_daily_emails', default: 5 })
  maxDailyEmails: number;

  @Column({ name: 'current_daily_limit', default: 2 })
  currentDailyLimit: number; // For warmup increment

  @Column({ name: 'target_daily_limit', default: 25 })
  targetDailyLimit: number;

  @Column({ name: 'warmup_daily_increment', default: 2 })
  warmupDailyIncrement: number;

  @Column({ name: 'is_warmup_active', default: true })
  isWarmupActive: boolean;

  @Column({ type: 'jsonb', name: 'matching_criteria', default: {} })
  matchingCriteria: MatchingCriteria;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'preview_enabled', default: true })
  previewEnabled: boolean; // If true, emails go to pending_review before sending

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
