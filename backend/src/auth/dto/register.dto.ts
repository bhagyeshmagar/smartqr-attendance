import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/types';

export class RegisterDto {
    @ApiProperty({ example: 'newuser@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(1)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(1)
    lastName: string;

    @ApiPropertyOptional({ enum: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'], example: 'STUDENT' })
    @IsOptional()
    @IsIn(['SUPER_ADMIN', 'ADMIN', 'STUDENT'])
    role?: UserRole;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    domainId?: string;
}
