import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'John' })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiPropertyOptional({ example: '2000-01-15' })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({ example: 'Male' })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiPropertyOptional({ example: 'Indian' })
    @IsOptional()
    @IsString()
    nationality?: string;

    @ApiPropertyOptional({ example: '+91-9876543210' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: '123 Current Street, City' })
    @IsOptional()
    @IsString()
    currentAddress?: string;

    @ApiPropertyOptional({ example: '456 Permanent Street, City' })
    @IsOptional()
    @IsString()
    permanentAddress?: string;

    @ApiPropertyOptional({ example: '{"10th": "85%", "12th": "90%", "degree": "75%"}' })
    @IsOptional()
    @IsString()
    academicMarks?: string;
}
