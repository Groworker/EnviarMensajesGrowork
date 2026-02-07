import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvCreator } from '../entities/cv-creator.entity';
import { CvCreatorsService } from './cv-creators.service';
import { CvCreatorsController } from './cv-creators.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CvCreator])],
  controllers: [CvCreatorsController],
  providers: [CvCreatorsService],
  exports: [CvCreatorsService],
})
export class CvCreatorsModule {}
