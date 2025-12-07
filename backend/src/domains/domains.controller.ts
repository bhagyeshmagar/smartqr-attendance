import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('domains')
export class DomainsController {
    constructor(private readonly domainsService: DomainsService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new domain' })
    async create(@Body() dto: CreateDomainDto) {
        return this.domainsService.create(dto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all domains' })
    async findAll() {
        return this.domainsService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get domain by ID' })
    async findById(@Param('id') id: string) {
        return this.domainsService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update a domain' })
    async update(@Param('id') id: string, @Body() dto: Partial<CreateDomainDto>) {
        return this.domainsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete a domain' })
    async delete(@Param('id') id: string) {
        await this.domainsService.delete(id);
        return { message: 'Domain deleted successfully' };
    }
}
