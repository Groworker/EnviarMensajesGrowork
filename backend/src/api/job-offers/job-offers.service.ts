import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from '../../entities/job-offer.entity';

@Injectable()
export class JobOffersService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
  ) {}

  async getDistinctValues(field: string): Promise<string[]> {
    const results = await this.jobOfferRepository
      .createQueryBuilder('offer')
      .select(`DISTINCT offer.${field}`, 'value')
      .where(`offer.${field} IS NOT NULL AND offer.${field} != ''`)
      .orderBy('value', 'ASC')
      .limit(200)
      .getRawMany();

    return results.map((r) => r.value).filter(Boolean);
  }
}
