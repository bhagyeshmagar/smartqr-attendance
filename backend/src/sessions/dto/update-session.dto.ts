import { IsString, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
    @ApiPropertyOptional({ example: 'Updated Session Title' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    title?: string;

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
    @IsOptional()
    @IsDateString()
    scheduledAt?: string;
}
