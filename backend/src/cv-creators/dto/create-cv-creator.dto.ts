import { IsString, IsEmail, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateCvCreatorDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsBoolean()
  ingles: boolean;

  @IsBoolean()
  aleman: boolean;

  @IsBoolean()
  frances: boolean;

  @IsBoolean()
  italiano: boolean;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  notas?: string;
}
