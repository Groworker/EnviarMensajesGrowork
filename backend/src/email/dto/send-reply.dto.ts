import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SendReplyDto {
  @IsString()
  @IsNotEmpty({ message: 'El asunto es requerido' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'El contenido es requerido' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  htmlContent: string;
}
