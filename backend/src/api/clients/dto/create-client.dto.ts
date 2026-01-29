import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsPhoneNumber,
  IsUrl,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Zoho ID is required' })
  @MaxLength(50)
  zohoId: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  apellido?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  email?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  emailOperativo?: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(255)
  emailOperativoPw?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  industria?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  jobTitle?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  estado?: string;

  @IsOptional()
  @IsUrl({}, { each: true, message: 'Invalid Drive URL format' })
  driveClientFolderUrl?: string;

  @IsOptional()
  @IsUrl()
  driveCvFolderUrl?: string;

  @IsOptional()
  notes?: string;
}
