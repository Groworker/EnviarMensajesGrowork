import { PartialType } from '@nestjs/mapped-types';
import { CreateDominioDto } from './create-dominio.dto';

export class UpdateDominioDto extends PartialType(CreateDominioDto) {}
