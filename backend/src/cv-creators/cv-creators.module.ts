import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvCreator } from '../entities/cv-creator.entity';
import { Client } from '../entities/client.entity';
import { CvCreatorsService } from './cv-creators.service';
import { CvCreatorsController } from './cv-creators.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CvCreator, Client])],
  controllers: [CvCreatorsController],
  providers: [CvCreatorsService],
  exports: [CvCreatorsService],
})
export class CvCreatorsModule {}
