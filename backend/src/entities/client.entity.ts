import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { ClientSendSettings } from './client-send-settings.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'zoho_id', unique: true, length: 50 })
  zohoId: string;

  @Index()
  @Column({ length: 100, nullable: true })
  nombre: string;

  @Column({ length: 100, nullable: true })
  apellido: string;

  @Column({ name: 'email_operativo', length: 255, nullable: true })
  emailOperativo: string;

  @Column({ name: 'email_operativo_pw', length: 255, nullable: true })
  emailOperativoPw: string;

  @Column({
    name: 'fecha_creacion_email_operativo',
    type: 'timestamp',
    nullable: true,
  })
  fechaCreacionEmailOperativo: Date;

  @Column({ length: 150, nullable: true })
  industria: string;

  @Column({ name: 'job_title', length: 150, nullable: true })
  jobTitle: string;

  @Column({ name: 'id_carpeta_cliente', length: 200, nullable: true })
  idCarpetaCliente: string;

  @Column({ name: 'id_carpeta_cv', length: 200, nullable: true })
  idCarpetaCv: string;

  // Old folder IDs kept for compatibility
  @Column({ name: 'id_carpeta_old', length: 200, nullable: true })
  idCarpetaOld: string;

  @Column({ name: 'id_carpeta_new', length: 200, nullable: true })
  idCarpetaNew: string;

  @Column({ name: 'id_carpeta_definitiva', length: 200, nullable: true })
  idCarpetaDefinitiva: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ length: 100, nullable: true })
  estado: string;

  @Column({ name: 'motivo_cierre', type: 'varchar', length: 100, nullable: true })
  motivoCierre: string | null;

  @Column({ type: 'jsonb', name: 'paises_interes', nullable: true })
  paisesInteres: string[] | null;

  @Column({ type: 'jsonb', name: 'ciudades_interes', nullable: true })
  ciudadesInteres: string[] | null;

  @Column({ name: 'zoho_modified_time', type: 'timestamp', nullable: true })
  zohoModifiedTime: Date;

  @Index()
  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  // Drive folder URLs
  @Column({ name: 'drive_client_folder_url', type: 'text', nullable: true })
  driveClientFolderUrl: string;

  @Column({ name: 'drive_cv_folder_url', type: 'text', nullable: true })
  driveCvFolderUrl: string;

  @Column({ name: 'drive_cv_old_folder_url', type: 'text', nullable: true })
  driveCvOldFolderUrl: string;

  @Column({ name: 'drive_cv_new_folder_url', type: 'text', nullable: true })
  driveCvNewFolderUrl: string;

  @Column({
    name: 'drive_cv_definitiva_folder_url',
    type: 'text',
    nullable: true,
  })
  driveCvDefinitivaFolderUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deletion_reason', type: 'text', nullable: true })
  deletionReason: string | null;

  // Auto-deletion tracking fields
  @Column({ name: 'estado_changed_at', type: 'timestamp', nullable: true })
  estadoChangedAt: Date;

  @Column({ name: 'last_email_sent_at', type: 'timestamp', nullable: true })
  lastEmailSentAt: Date;

  // Discord integration
  @Column({ name: 'discord_channel_id', length: 100, nullable: true })
  discordChannelId: string;

  // Relation to Send Settings (One-to-One)
  @OneToOne(() => ClientSendSettings, (settings) => settings.client)
  sendSettings: ClientSendSettings;
}
