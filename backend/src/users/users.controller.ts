import { Controller, Get, Post, Param, Patch, Delete, UseGuards, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

interface AuthUser {
    id: string;
    role: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all users' })
    async findAll() {
        return this.usersService.findAll();
    }

    @Get('admins')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all admins (Super Admin only)' })
    async findAdmins() {
        return this.usersService.findAdmins();
    }

    @Post('admin')
    @Roles(UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new admin (Super Admin only)' })
    async createAdmin(
        @Body() body: { email: string; firstName: string; lastName: string; tempPassword: string },
    ) {
        return this.usersService.createAdmin(
            body.email,
            body.firstName,
            body.lastName,
            body.tempPassword,
        );
    }

    @Post('student')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new student (Admin or Super Admin)' })
    async createStudent(
        @Body() body: { email: string; firstName: string; lastName: string; tempPassword: string; domainId?: string },
        @Req() req: Request,
    ) {
        const user = req.user as AuthUser;
        // Admin: use their own domain; Super Admin: use provided domainId or null
        let domainId = body.domainId;
        if (user.role === UserRole.ADMIN) {
            // Get admin's domain
            const admin = await this.usersService.findById(user.id);
            domainId = admin.domainId || undefined;
        }
        return this.usersService.createStudent(
            body.email,
            body.firstName,
            body.lastName,
            body.tempPassword,
            domainId,
        );
    }

    @Get('domain/:domainId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get users by domain' })
    async findByDomain(
        @Param('domainId') domainId: string,
        @Query('role') role?: UserRole,
    ) {
        return this.usersService.findByDomain(domainId, role);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user by ID' })
    async findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id/activate')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Activate a user' })
    async activate(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.usersService.updateStatus(id, true, user.id, user.role);
    }

    @Patch(':id/deactivate')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Deactivate a user' })
    async deactivate(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.usersService.updateStatus(id, false, user.id, user.role);
    }

    @Patch(':id/prn')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Assign PRN to a user' })
    async assignPrn(
        @Param('id') id: string,
        @Body('prn') prn: string,
    ) {
        return this.usersService.assignPrn(id, prn);
    }

    @Patch(':id/email')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update user email (Super Admin: all, Admin: students only)' })
    async updateEmail(
        @Param('id') id: string,
        @Body('email') email: string,
        @Req() req: Request,
    ) {
        const user = req.user as AuthUser;
        return this.usersService.updateEmail(id, email, user.id, user.role);
    }

    @Post(':id/delete')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a user with password verification' })
    async deleteWithPassword(
        @Param('id') id: string,
        @Body('password') password: string,
        @Req() req: Request,
    ) {
        const user = req.user as AuthUser;
        return this.usersService.deleteWithPassword(id, user.id, password, user.role);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete a user' })
    async delete(@Param('id') id: string, @Req() req: Request) {
        const user = req.user as AuthUser;
        return this.usersService.deleteUser(id, user.id, user.role);
    }

    @Patch('change-password')
    @ApiOperation({ summary: 'Change own password' })
    async changePassword(
        @Body() body: { currentPassword: string; newPassword: string },
        @Req() req: Request,
    ) {
        const user = req.user as AuthUser;
        return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
    }
}
