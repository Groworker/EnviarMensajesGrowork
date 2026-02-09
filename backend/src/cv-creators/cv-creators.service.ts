import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvCreator } from '../entities/cv-creator.entity';
import { Client } from '../entities/client.entity';
import { CreateCvCreatorDto, UpdateCvCreatorDto } from './dto';

@Injectable()
export class CvCreatorsService {
  private readonly logger = new Logger(CvCreatorsService.name);

  constructor(
    @InjectRepository(CvCreator)
    private readonly cvCreatorsRepository: Repository<CvCreator>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * Normaliza el nombre del idioma para que coincida con los campos de la base de datos
   * Convierte "Inglés" → "ingles", "Alemán" → "aleman", etc.
   */
  private normalizeIdioma(idioma: string): string {
    const idiomaMap: Record<string, string> = {
      'ingles': 'ingles',
      'inglés': 'ingles',
      'english': 'ingles',
      'aleman': 'aleman',
      'alemán': 'aleman',
      'german': 'aleman',
      'frances': 'frances',
      'francés': 'frances',
      'french': 'frances',
      'italiano': 'italiano',
      'italian': 'italiano',
    };

    const normalized = idiomaMap[idioma.toLowerCase()];
    if (!normalized) {
      this.logger.warn(`Unknown language: ${idioma}, returning original value`);
      return idioma.toLowerCase();
    }

    return normalized;
  }

  async findAll(idioma?: string): Promise<CvCreator[]> {
    this.logger.log(`Finding all CV creators${idioma ? ` for language: ${idioma}` : ''}`);

    const queryBuilder = this.cvCreatorsRepository
      .createQueryBuilder('creator')
      .where('creator.activo = :activo', { activo: true });

    if (idioma) {
      // Normalize language name (e.g., "Inglés" → "ingles")
      const normalizedIdioma = this.normalizeIdioma(idioma);
      const validLanguages = ['ingles', 'aleman', 'frances', 'italiano'];

      if (validLanguages.includes(normalizedIdioma)) {
        this.logger.log(`Normalized language "${idioma}" → "${normalizedIdioma}"`);
        queryBuilder.andWhere(`creator.${normalizedIdioma} = :value`, { value: true });
      }
    }

    return queryBuilder.orderBy('creator.nombre', 'ASC').getMany();
  }

  async findOne(id: number): Promise<CvCreator> {
    this.logger.log(`Finding CV creator with id: ${id}`);

    const creator = await this.cvCreatorsRepository.findOne({
      where: { id },
    });

    if (!creator) {
      throw new NotFoundException(`CV creator with ID ${id} not found`);
    }

    return creator;
  }

  async create(createCvCreatorDto: CreateCvCreatorDto): Promise<CvCreator> {
    this.logger.log(`Creating new CV creator: ${createCvCreatorDto.nombre}`);

    const creator = this.cvCreatorsRepository.create(createCvCreatorDto);
    return this.cvCreatorsRepository.save(creator);
  }

  async update(id: number, updateCvCreatorDto: UpdateCvCreatorDto): Promise<CvCreator> {
    this.logger.log(`Updating CV creator with id: ${id}`);

    const creator = await this.findOne(id);
    Object.assign(creator, updateCvCreatorDto);
    return this.cvCreatorsRepository.save(creator);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing CV creator with id: ${id}`);

    const creator = await this.findOne(id);
    await this.cvCreatorsRepository.remove(creator);
  }

  async getCreatorStats(id: number): Promise<{
    creator: CvCreator;
    stats: { total: number; pendiente: number; en_proceso: number; finalizado: number; cancelado: number };
    clients: Client[];
  }> {
    const creator = await this.findOne(id);

    const clients = await this.clientRepository.find({
      where: { cvCreatorId: id },
      order: { createdAt: 'DESC' },
    });

    const activeClients = clients.filter(c => !c.deletedAt);

    const stats = {
      total: activeClients.length,
      pendiente: activeClients.filter(c => c.cvStatus === 'pendiente').length,
      en_proceso: activeClients.filter(c => c.cvStatus === 'en_proceso').length,
      finalizado: activeClients.filter(c => c.cvStatus === 'finalizado').length,
      cancelado: activeClients.filter(c => c.cvStatus === 'cancelado').length,
    };

    return { creator, stats, clients: activeClients };
  }

  async getStatsSummary(): Promise<{
    totalAsignados: number;
    pendiente: number;
    enProceso: number;
    finalizado: number;
    cancelado: number;
    sinAsignar: number;
  }> {
    const assigned = await this.clientRepository
      .createQueryBuilder('client')
      .select('client.cv_status', 'cvStatus')
      .addSelect('COUNT(*)', 'count')
      .where('client.deleted_at IS NULL')
      .andWhere('client.cv_creator_id IS NOT NULL')
      .groupBy('client.cv_status')
      .getRawMany();

    const sinAsignar = await this.clientRepository
      .createQueryBuilder('client')
      .where('client.deleted_at IS NULL')
      .andWhere('client.cv_creator_id IS NULL')
      .getCount();

    const counts: Record<string, number> = {};
    assigned.forEach(row => {
      counts[row.cvStatus || 'pendiente'] = parseInt(row.count, 10);
    });

    const totalAsignados = Object.values(counts).reduce((sum, val) => sum + val, 0);

    return {
      totalAsignados,
      pendiente: counts['pendiente'] || 0,
      enProceso: counts['en_proceso'] || 0,
      finalizado: counts['finalizado'] || 0,
      cancelado: counts['cancelado'] || 0,
      sinAsignar,
    };
  }

  async findByIdioma(idioma: string): Promise<CvCreator[]> {
    this.logger.log(`Finding active CV creators for language: ${idioma}`);

    // Normalize language name (e.g., "Inglés" → "ingles")
    const normalizedIdioma = this.normalizeIdioma(idioma);
    const validLanguages = ['ingles', 'aleman', 'frances', 'italiano'];

    if (!validLanguages.includes(normalizedIdioma)) {
      throw new Error(`Invalid language: ${idioma}. Valid options: ${validLanguages.join(', ')}`);
    }

    this.logger.log(`Normalized language "${idioma}" → "${normalizedIdioma}"`);

    return this.cvCreatorsRepository
      .createQueryBuilder('creator')
      .where('creator.activo = :activo', { activo: true })
      .andWhere(`creator.${normalizedIdioma} = :value`, { value: true })
      .orderBy('creator.nombre', 'ASC')
      .getMany();
  }
}
