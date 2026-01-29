import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('email_reputation')
@Unique(['email'])
export class EmailReputation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  email: string;

  @Column({ default: false })
  is_bounced: boolean;

  @Column({ default: false })
  is_invalid: boolean;

  @Column({ default: 0 })
  bounce_count: number;

  @Column({ type: 'text', nullable: true })
  last_bounce_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
