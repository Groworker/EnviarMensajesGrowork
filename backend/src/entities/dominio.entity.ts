import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('dominios')
export class Dominio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  @Index({ unique: true })
  dominio: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 1 })
  prioridad: number;

  @Column({ name: 'usuarios_actuales', type: 'int', default: 0, nullable: true })
  usuariosActuales: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
