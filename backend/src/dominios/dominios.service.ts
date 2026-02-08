import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dominio } from '../entities/dominio.entity';
import { Client } from '../entities/client.entity';
import { CreateDominioDto, UpdateDominioDto } from './dto';

@Injectable()
export class DominiosService {
  private readonly logger = new Logger(DominiosService.name);

  constructor(
    @InjectRepository(Dominio)
    private readonly dominiosRepository: Repository<Dominio>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async findAll(): Promise<Dominio[]> {
    this.logger.log('Finding all dominios');
    const dominios = await this.dominiosRepository.find({
      order: { prioridad: 'DESC', dominio: 'ASC' },
    });

    // Calculate usuariosActuales from clients table
    for (const dominio of dominios) {
      const count = await this.clientsRepository
        .createQueryBuilder('client')
        .where('client.emailOperativo LIKE :pattern', { pattern: `%@${dominio.dominio}` })
        .getCount();
      dominio.usuariosActuales = count;
    }

    return dominios;
  }

  async findOne(id: number): Promise<Dominio> {
    this.logger.log(`Finding dominio with id: ${id}`);
    const dominio = await this.dominiosRepository.findOne({ where: { id } });
    if (!dominio) {
      throw new NotFoundException(`Dominio with ID ${id} not found`);
    }
    return dominio;
  }

  async create(createDominioDto: CreateDominioDto): Promise<Dominio> {
    this.logger.log(`Creating new dominio: ${createDominioDto.dominio}`);
    const dominio = this.dominiosRepository.create(createDominioDto);
    return this.dominiosRepository.save(dominio);
  }

  async update(id: number, updateDominioDto: UpdateDominioDto): Promise<Dominio> {
    this.logger.log(`Updating dominio with id: ${id}`);
    const dominio = await this.findOne(id);
    Object.assign(dominio, updateDominioDto);
    return this.dominiosRepository.save(dominio);
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removing dominio with id: ${id}`);
    const dominio = await this.findOne(id);
    await this.dominiosRepository.remove(dominio);
  }
}
