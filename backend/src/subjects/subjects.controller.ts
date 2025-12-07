import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

interface AuthUser {
    id: string;
    role: string;
}

@ApiTags('Subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
    constructor(private readonly subjectsService: SubjectsService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new subject' })
    async create(@Body() dto: CreateSubjectDto, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.subjectsService.create(dto, user.id);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all subjects (filtered by admin)' })
    async findAll(@Query('domainId') domainId: string | undefined, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.subjectsService.findAll(domainId, user.id, user.role);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get subject by ID' })
    async findById(@Param('id') id: string) {
        return this.subjectsService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update a subject' })
    async update(@Param('id') id: string, @Body() dto: Partial<CreateSubjectDto>) {
        return this.subjectsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a subject' })
    async delete(@Param('id') id: string) {
        await this.subjectsService.delete(id);
        return { message: 'Subject deleted successfully' };
    }
}
