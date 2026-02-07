import { PartialType } from '@nestjs/mapped-types';
import { CreateCvCreatorDto } from './create-cv-creator.dto';

export class UpdateCvCreatorDto extends PartialType(CreateCvCreatorDto) {}
