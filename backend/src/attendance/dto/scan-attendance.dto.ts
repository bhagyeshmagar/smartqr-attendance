import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GeoDto {
    @ApiPropertyOptional({ example: 'US' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ example: 'New York' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 40.7128 })
    @IsOptional()
    lat?: number;

    @ApiPropertyOptional({ example: -74.006 })
    @IsOptional()
    lon?: number;
}

export class ScanAttendanceDto {
    @ApiProperty({ example: 'eyJzaWQiOiJhYmMxMjMiLCJpYXQiOjE2...' })
    @IsString()
    token: string;

    @ApiPropertyOptional({ example: 'fp_abc123xyz' })
    @IsOptional()
    @IsString()
    deviceFp?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested()
    @Type(() => GeoDto)
    geo?: GeoDto;
}
