import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteClientDto {
    @IsBoolean()
    confirmed: boolean; // Must be true to proceed with deletion

    @IsString()
    @IsOptional()
    reason?: string; // Optional reason for deletion
}
