import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { AnomalyService } from '../anomaly/anomaly.service';
import { SessionsService } from '../sessions/sessions.service';
import { WsGateway } from '../ws/ws.gateway';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { SessionPhase, AttendanceStatus } from '../common/types';

export interface AttendanceMetadata {
    ip: string;
    userAgent: string;
    deviceFp?: string;
    geo?: {
        country?: string;
        city?: string;
        lat?: number;
        lon?: number;
    };
}

@Injectable()
export class AttendanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly qrService: QrService,
        private readonly anomalyService: AnomalyService,
        private readonly sessionsService: SessionsService,
        private readonly wsGateway: WsGateway,
    ) { }

    async markAttendance(
        userId: string,
        dto: ScanAttendanceDto,
        meta: AttendanceMetadata,
    ) {
        // 1. Verify the token
        const verification = this.qrService.verifyToken(dto.token);
        if (!verification.valid || !verification.payload) {
            throw new BadRequestException(verification.error || 'Invalid token');
        }

        const { sid: sessionId, iat, exp } = verification.payload;

        // 2. Check if session is active
        const isActive = await this.sessionsService.isActive(sessionId);
        if (!isActive) {
            throw new BadRequestException('Session is not active');
        }

        // 3. Get session details for phase check
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            select: { id: true, domainId: true, phase: true },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        const currentPhase = session.phase as SessionPhase;

        // 4. Check anomaly detection
        const country = meta.geo?.country || this.extractCountryFromIp(meta.ip);
        let verificationFlags: { flagged?: boolean; reason?: string } | null = null;

        if (country) {
            const isFlagged = await this.anomalyService.checkAndRecordTokenUsage(
                dto.token,
                {
                    ip: meta.ip,
                    deviceFp: meta.deviceFp || 'unknown',
                    country,
                },
                this.qrService.getTokenTtl(),
            );

            if (isFlagged) {
                verificationFlags = {
                    flagged: true,
                    reason: 'geo-dispersion',
                };
            }
        }

        // 5. Check if attendance record exists
        const existingAttendance = await this.prisma.attendance.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId,
                },
            },
        });

        if (existingAttendance) {
            // Record exists - handle based on phase
            if (currentPhase === SessionPhase.ENTRY) {
                throw new ConflictException('Entry already marked for this session');
            }

            if (currentPhase === SessionPhase.EXIT) {
                if (existingAttendance.exitAt) {
                    throw new ConflictException('Exit already marked for this session');
                }

                // Update with exit time and mark as PRESENT
                const updated = await this.prisma.attendance.update({
                    where: { id: existingAttendance.id },
                    data: {
                        exitAt: new Date(),
                        status: AttendanceStatus.PRESENT,
                    },
                    include: {
                        user: {
                            select: { id: true, email: true, firstName: true, lastName: true },
                        },
                    },
                });

                this.wsGateway.broadcastAttendance(sessionId, {
                    userId: updated.user.id,
                    userName: `${updated.user.firstName} ${updated.user.lastName}`,
                    markedAt: updated.exitAt!,
                    phase: 'EXIT',
                });

                return {
                    success: true,
                    phase: 'EXIT',
                    attendance: {
                        id: updated.id,
                        sessionId: updated.sessionId,
                        entryAt: updated.entryAt,
                        exitAt: updated.exitAt,
                        status: updated.status,
                    },
                    message: 'Exit marked successfully - attendance complete',
                };
            }
        }

        // No existing record - create new attendance for ENTRY phase
        if (currentPhase === SessionPhase.EXIT && !existingAttendance) {
            // Student trying to scan exit without entry - create absent record
            const attendance = await this.prisma.attendance.create({
                data: {
                    sessionId,
                    userId,
                    tokenIat: new Date(iat * 1000),
                    tokenExp: new Date(exp * 1000),
                    ip: meta.ip,
                    userAgent: meta.userAgent,
                    deviceFp: meta.deviceFp,
                    geo: meta.geo ? JSON.stringify(meta.geo) : null,
                    verificationFlags: verificationFlags ? JSON.stringify(verificationFlags) : null,
                    exitAt: new Date(),
                    status: AttendanceStatus.ABSENT, // No entry = absent
                },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            });

            return {
                success: false,
                phase: 'EXIT',
                attendance: {
                    id: attendance.id,
                    sessionId: attendance.sessionId,
                    status: attendance.status,
                },
                message: 'Marked as absent - entry was not scanned',
            };
        }

        // Create new entry record
        try {
            const attendance = await this.prisma.attendance.create({
                data: {
                    sessionId,
                    userId,
                    tokenIat: new Date(iat * 1000),
                    tokenExp: new Date(exp * 1000),
                    ip: meta.ip,
                    userAgent: meta.userAgent,
                    deviceFp: meta.deviceFp,
                    geo: meta.geo ? JSON.stringify(meta.geo) : null,
                    verificationFlags: verificationFlags ? JSON.stringify(verificationFlags) : null,
                    entryAt: new Date(),
                    status: AttendanceStatus.PENDING, // Pending until exit scanned
                },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            });

            this.wsGateway.broadcastAttendance(sessionId, {
                userId: attendance.user.id,
                userName: `${attendance.user.firstName} ${attendance.user.lastName}`,
                markedAt: attendance.entryAt!,
                phase: 'ENTRY',
                verificationFlags: verificationFlags || undefined,
            });

            return {
                success: true,
                phase: 'ENTRY',
                attendance: {
                    id: attendance.id,
                    sessionId: attendance.sessionId,
                    entryAt: attendance.entryAt,
                    status: attendance.status,
                    verificationFlags: attendance.verificationFlags,
                },
                message: verificationFlags?.flagged
                    ? 'Entry marked with verification flag - scan exit to complete'
                    : 'Entry marked successfully - scan exit to complete attendance',
            };
        } catch (error: unknown) {
            if (
                error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Attendance already marked for this session');
            }
            throw error;
        }
    }

    async getBySession(sessionId: string) {
        return this.prisma.attendance.findMany({
            where: { sessionId },
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true, prn: true },
                },
            },
            orderBy: { markedAt: 'desc' },
        });
    }

    async getByUser(userId: string) {
        return this.prisma.attendance.findMany({
            where: { userId },
            include: {
                session: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        phase: true,
                        sessionNumber: true,
                        startedAt: true,
                        endedAt: true,
                        subject: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
            orderBy: { markedAt: 'desc' },
        });
    }

    async getByUserGroupedBySubject(userId: string) {
        const attendances = await this.getByUser(userId);

        // Group by subject
        const grouped: Record<string, {
            subject: { id: string; name: string; code: string | null } | null;
            sessions: Array<{
                sessionId: string;
                sessionNumber: number;
                title: string;
                status: string;
                startedAt: Date | null;
                endedAt: Date | null;
                entryAt: Date | null;
                exitAt: Date | null;
                attendanceStatus: string;
            }>;
        }> = {};

        for (const att of attendances) {
            const subjectId = att.session.subject?.id || 'no-subject';
            const subject = att.session.subject;

            if (!grouped[subjectId]) {
                grouped[subjectId] = {
                    subject: subject || null,
                    sessions: [],
                };
            }

            grouped[subjectId].sessions.push({
                sessionId: att.session.id,
                sessionNumber: att.session.sessionNumber,
                title: att.session.title,
                status: att.session.status,
                startedAt: att.session.startedAt,
                endedAt: att.session.endedAt,
                entryAt: att.entryAt,
                exitAt: att.exitAt,
                attendanceStatus: att.status,
            });
        }

        return Object.values(grouped);
    }

    async getFlaggedBySession(sessionId: string) {
        return this.prisma.attendance.findMany({
            where: {
                sessionId,
                verificationFlags: {
                    contains: '"flagged":true',
                },
            },
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
            orderBy: { markedAt: 'desc' },
        });
    }

    private extractCountryFromIp(ip: string): string | null {
        if (ip === '127.0.0.1' || ip === '::1') {
            return 'LOCAL';
        }
        return null;
    }
}
