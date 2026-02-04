import { IsString, IsOptional } from 'class-validator';

export class UpdateEmailDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
