import { IsString, IsBoolean, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateDominioDto {
  @IsString()
  @MaxLength(255)
  dominio: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  prioridad?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  usuariosActuales?: number;
}
