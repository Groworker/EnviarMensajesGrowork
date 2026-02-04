import { IsIn, IsString } from 'class-validator';

// Estados válidos basados en tus requisitos
export const ESTADOS_VALIDOS = [
  'Envío activo',
  'Entrevista',
  'Contratado',
  'Cerrado',
  'Pausado',
] as const;

export type EstadoCliente = (typeof ESTADOS_VALIDOS)[number];

export class UpdateEstadoDto {
  @IsString()
  @IsIn(ESTADOS_VALIDOS, {
    message: `Estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
  })
  estado: EstadoCliente;
}
