import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('job_offers')
export class JobOffer {
  @Index()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'execution_id', nullable: true })
  executionId: number;

  @Column({ length: 500, nullable: true })
  hotel: string;

  @Column({ length: 500, nullable: true })
  puesto: string;

  @Column({ length: 255, nullable: true })
  ciudad: string;

  @Index()
  @Column({ length: 500, nullable: true })
  email: string;

  @Column({ name: 'url_oferta', length: 1000, nullable: true })
  urlOferta: string;

  @Column({ name: 'fecha_publicacion', length: 100, nullable: true })
  fechaPublicacion: string;

  @Column({ length: 500, nullable: true })
  empresa: string;

  @Column({ length: 100, nullable: true })
  pais: string;

  @Column({ length: 100, nullable: true })
  fuente: string;

  @Column({ name: 'fecha_scrape', type: 'timestamp', nullable: true })
  fechaScrape: Date;

  @Column({ name: 'texto_oferta', type: 'text', nullable: true })
  textoOferta: string;
}
