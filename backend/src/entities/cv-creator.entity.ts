import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cv_creators')
export class CvCreator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  @Index()
  nombre: string;

  @Column({ length: 255 })
  @Index()
  email: string;

  @Column({ default: false })
  ingles: boolean;

  @Column({ default: false })
  aleman: boolean;

  @Column({ default: false })
  frances: boolean;

  @Column({ default: false })
  italiano: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
