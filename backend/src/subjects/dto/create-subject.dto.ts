import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
    @ApiProperty({ example: 'Introduction to Computer Science' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'CS101' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: 'Fundamentals of programming and algorithms' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 'domain-uuid' })
    @IsString()
    domainId: string;
}
