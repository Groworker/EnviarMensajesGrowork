import {
    IsInt,
    IsBoolean,
    Min,
    Max,
    IsOptional,
    ValidateIf,
} from 'class-validator';

export class UpdateGlobalConfigDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(23)
    startHour?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(23)
    @ValidateIf((o) => o.startHour !== undefined && o.endHour !== undefined)
    endHour?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    minDelayMinutes?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @ValidateIf(
        (o) => o.minDelayMinutes !== undefined && o.maxDelayMinutes !== undefined,
    )
    maxDelayMinutes?: number;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
