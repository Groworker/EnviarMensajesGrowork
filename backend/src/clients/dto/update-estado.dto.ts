import { IsIn, IsOptional, IsString } from 'class-validator';

// Estados válidos - sincronizados con Zoho CRM
export const ESTADOS_VALIDOS = [
  'Onboarding',
  'In Progress',
  'Closed',
] as const;

export type EstadoCliente = (typeof ESTADOS_VALIDOS)[number];

// Motivos de cierre válidos - sincronizados con Zoho CRM (campo Motivo_de_cierre)
export const MOTIVOS_CIERRE_VALIDOS = [
  'Contratad@',
  'Sin correos restantes',
  'Baja del Cliente',
  'Problemas Técnicos',
] as const;

export type MotivoCierre = (typeof MOTIVOS_CIERRE_VALIDOS)[number];

export class UpdateEstadoDto {
  @IsString()
  @IsIn(ESTADOS_VALIDOS, {
    message: `Estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
  })
  estado: EstadoCliente;

  @IsOptional()
  @IsString()
  @IsIn(MOTIVOS_CIERRE_VALIDOS, {
    message: `Motivo de cierre debe ser uno de: ${MOTIVOS_CIERRE_VALIDOS.join(', ')}`,
  })
  motivoCierre?: MotivoCierre;
}
