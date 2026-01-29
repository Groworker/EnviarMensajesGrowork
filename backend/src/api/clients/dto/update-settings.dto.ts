import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsArray,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class MatchingCriteriaDto {
  // Legacy fields - mantener por compatibilidad pero ya no se usan
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  // Nuevos campos de configuración
  @IsOptional()
  @IsIn(['all', 'any'])
  matchMode?: string;

  @IsOptional()
  @IsIn(['exact', 'contains'])
  jobTitleMatchMode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledFilters?: string[];
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isWarmupActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Minimum daily emails must be at least 1' })
  @Max(1000, { message: 'Minimum daily emails cannot exceed 1000' })
  minDailyEmails?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Maximum daily emails must be at least 1' })
  @Max(1000, { message: 'Maximum daily emails cannot exceed 1000' })
  maxDailyEmails?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  currentDailyLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  targetDailyLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Warmup daily increment must be at least 1' })
  @Max(20, { message: 'Warmup daily increment cannot exceed 20' })
  warmupDailyIncrement?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchingCriteriaDto)
  matchingCriteria?: MatchingCriteriaDto;
}
