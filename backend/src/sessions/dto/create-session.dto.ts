import { IsString, MinLength, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiProperty({ example: 'Introduction to Computer Science' })
    @IsString()
    @MinLength(2)
    title: string;

    @ApiPropertyOptional({ example: 'First lecture of the semester' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'uuid-of-domain' })
    @IsUUID()
    domainId: string;

    @ApiPropertyOptional({ example: 'uuid-of-subject' })
    @IsOptional()
    @IsUUID()
    subjectId?: string;

    @ApiPropertyOptional({ example: '2024-01-15T09:00:00Z' })
    @IsOptional()
    @IsDateString()
    scheduledAt?: string;
}
