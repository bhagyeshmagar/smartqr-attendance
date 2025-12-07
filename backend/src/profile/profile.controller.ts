import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.usersService.findById(user.id);
    }

    @Patch()
    @ApiOperation({ summary: 'Update current user profile' })
    async updateProfile(
        @Req() req: Request,
        @Body() dto: UpdateProfileDto,
    ) {
        const user = req.user as { id: string };

        // Convert dateOfBirth string to Date if provided
        const data: Record<string, unknown> = { ...dto };
        if (dto.dateOfBirth) {
            data.dateOfBirth = new Date(dto.dateOfBirth);
        }

        return this.usersService.updateProfile(user.id, data as Parameters<typeof this.usersService.updateProfile>[1]);
    }
}
