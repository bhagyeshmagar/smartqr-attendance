import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { DeleteRequestsService } from './delete-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

interface AuthUser {
    id: string;
    role: string;
}

@ApiTags('Delete Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('delete-requests')
export class DeleteRequestsController {
    constructor(private readonly deleteRequestsService: DeleteRequestsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a delete request for session/subject' })
    async create(
        @Body() body: { type: 'SESSION' | 'SUBJECT'; targetId: string; reason?: string },
        @Req() req: Request,
    ) {
        const user = req.user as AuthUser;
        return this.deleteRequestsService.createRequest(
            body.type,
            body.targetId,
            user.id,
            body.reason,
        );
    }

    @Get('pending')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all pending delete requests (Super Admin only)' })
    async getPending() {
        return this.deleteRequestsService.getPendingRequests();
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all delete requests (Super Admin only)' })
    async getAll() {
        return this.deleteRequestsService.getAllRequests();
    }

    @Get('my')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get my delete requests' })
    async getMyRequests(@Req() req: Request) {
        const user = req.user as AuthUser;
        return this.deleteRequestsService.getMyRequests(user.id);
    }

    @Post(':id/approve')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Approve a delete request (Super Admin only)' })
    async approve(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.deleteRequestsService.approveRequest(id, user.id, user.role);
    }

    @Post(':id/deny')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Deny a delete request (Super Admin only)' })
    async deny(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.deleteRequestsService.denyRequest(id, user.id, user.role);
    }
}
