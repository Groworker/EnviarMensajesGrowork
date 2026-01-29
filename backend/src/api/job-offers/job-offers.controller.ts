import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { JobOffersService } from './job-offers.service';

@Controller('api/job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  @Get('distinct-values')
  async getDistinctValues(@Query('field') field: string): Promise<string[]> {
    const allowedFields = ['pais', 'ciudad'];
    if (!allowedFields.includes(field)) {
      throw new BadRequestException(
        'Invalid field. Allowed fields: pais, ciudad',
      );
    }
    return this.jobOffersService.getDistinctValues(field);
  }
}
