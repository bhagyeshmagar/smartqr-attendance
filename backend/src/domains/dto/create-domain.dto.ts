import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDomainDto {
    @ApiProperty({ example: 'Demo University' })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ example: 'demo-university' })
    @IsString()
    @MinLength(2)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    })
    slug: string;
}
