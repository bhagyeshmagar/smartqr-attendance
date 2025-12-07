import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Req,
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/types';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('scan')
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
    @ApiOperation({ summary: 'Mark attendance by scanning QR token' })
    async scan(
        @Body() dto: ScanAttendanceDto,
        @Req() req: Request,
        @Headers('user-agent') userAgent: string,
        @Headers('x-device-fingerprint') deviceFp?: string,
    ) {
        const user = req.user as { id: string };
        const ip = this.getClientIp(req);

        return this.attendanceService.markAttendance(user.id, dto, {
            ip,
            userAgent: userAgent || 'unknown',
            deviceFp,
            geo: dto.geo,
        });
    }

    @Get('session/:sessionId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all attendance records for a session' })
    async getBySession(@Param('sessionId') sessionId: string) {
        return this.attendanceService.getBySession(sessionId);
    }

    @Get('session/:sessionId/flagged')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get flagged attendance records for a session' })
    async getFlaggedBySession(@Param('sessionId') sessionId: string) {
        return this.attendanceService.getFlaggedBySession(sessionId);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get my attendance history' })
    async getMyAttendance(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.attendanceService.getByUser(user.id);
    }

    @Get('my/grouped')
    @ApiOperation({ summary: 'Get my attendance history grouped by subject' })
    async getMyAttendanceGrouped(@Req() req: Request) {
        const user = req.user as { id: string };
        return this.attendanceService.getByUserGroupedBySubject(user.id);
    }

    @Get('user/:userId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get attendance history for a user' })
    async getByUser(@Param('userId') userId: string) {
        return this.attendanceService.getByUser(userId);
    }

    private getClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        if (Array.isArray(forwarded)) {
            return forwarded[0];
        }
        return req.ip || req.socket.remoteAddress || 'unknown';
    }
}
