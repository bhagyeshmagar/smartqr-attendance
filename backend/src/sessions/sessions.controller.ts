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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';
import { QrService } from '../qr/qr.service';

interface AuthUser {
    id: string;
    role: string;
}

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
    constructor(
        private readonly sessionsService: SessionsService,
        private readonly qrService: QrService,
    ) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new session' })
    async create(@Body() dto: CreateSessionDto, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.sessionsService.create(dto, user.id);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all sessions (filtered by admin)' })
    async findAll(@Query('domainId') domainId: string | undefined, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.sessionsService.findAll(domainId, user.id, user.role);
    }

    @Get('active')
    @Roles(UserRole.STUDENT)
    @ApiOperation({ summary: 'Get active sessions for current student' })
    async getActiveForStudent(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.sessionsService.getActiveSessionsForStudent(user.id);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STUDENT)
    @ApiOperation({ summary: 'Get session by ID' })
    async findById(@Param('id') id: string) {
        return this.sessionsService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update a session' })
    async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
        return this.sessionsService.update(id, dto);
    }

    @Post(':id/start')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Start a session (begin accepting attendance)' })
    async start(@Param('id') id: string) {
        const session = await this.sessionsService.start(id);
        // Start token rotation with ENTRY phase
        this.qrService.startTokenRotation(id, session.domain?.id || '', 'ENTRY');
        return session;
    }

    @Post(':id/switch-to-exit')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Switch session to exit phase' })
    async switchToExitPhase(@Param('id') id: string) {
        const session = await this.sessionsService.switchToExitPhase(id);
        // Stop existing rotation and restart with EXIT phase (resets counter)
        this.qrService.stopTokenRotation(id);
        this.qrService.startTokenRotation(id, session.domain?.id || '', 'EXIT');
        return session;
    }

    @Post(':id/stop')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Stop a session (stop accepting attendance)' })
    async stop(@Param('id') id: string) {
        this.qrService.stopTokenRotation(id);
        return this.sessionsService.stop(id);
    }

    @Post(':id/cancel')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Cancel a session' })
    async cancel(@Param('id') id: string) {
        this.qrService.stopTokenRotation(id);
        return this.sessionsService.cancel(id);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a session' })
    async delete(@Param('id') id: string) {
        this.qrService.stopTokenRotation(id);
        await this.sessionsService.delete(id);
        return { message: 'Session deleted successfully' };
    }

    @Get(':id/token')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get current QR token for a session' })
    async getToken(@Param('id') id: string) {
        const session = await this.sessionsService.findById(id);
        if (session.status !== 'ACTIVE') {
            return { token: null, phase: null, message: 'Session is not active' };
        }

        const token = this.qrService.generateToken(id);
        return { token, phase: session.phase };
    }
}
