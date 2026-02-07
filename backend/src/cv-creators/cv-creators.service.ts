import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvCreator } from '../entities/cv-creator.entity';
import { CreateCvCreatorDto, UpdateCvCreatorDto } from './dto';

@Injectable()
export class CvCreatorsService {
  private readonly logger = new Logger(CvCreatorsService.name);

  constructor(
    @InjectRepository(CvCreator)
    private readonly cvCreatorsRepository: Repository<CvCreator>,
  ) {}

  async findAll(idioma?: string): Promise<CvCreator[]> {
    this.logger.log(`Finding all CV creators${idioma ? ` for language: ${idioma}` : ''}`);

    const queryBuilder = this.cvCreatorsRepository
      .createQueryBuilder('creator')
      .where('creator.activo = :activo', { activo: true });

    if (idioma) {
      // Filter by language (ingles, aleman, frances, italiano)
      const validLanguages = ['ingles', 'aleman', 'frances', 'italiano'];
      if (validLanguages.includes(idioma.toLowerCase())) {
        queryBuilder.andWhere(`creator.${idioma.toLowerCase()} = :value`, { value: true });
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

  async findByIdioma(idioma: string): Promise<CvCreator[]> {
    this.logger.log(`Finding active CV creators for language: ${idioma}`);

    const validLanguages = ['ingles', 'aleman', 'frances', 'italiano'];
    if (!validLanguages.includes(idioma.toLowerCase())) {
      throw new Error(`Invalid language: ${idioma}. Valid options: ${validLanguages.join(', ')}`);
    }

    return this.cvCreatorsRepository
      .createQueryBuilder('creator')
      .where('creator.activo = :activo', { activo: true })
      .andWhere(`creator.${idioma.toLowerCase()} = :value`, { value: true })
      .orderBy('creator.nombre', 'ASC')
      .getMany();
  }
}
