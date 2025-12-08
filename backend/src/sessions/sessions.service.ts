import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionStatus, SessionPhase, AttendanceStatus, UserRole } from '../common/types';

@Injectable()
export class SessionsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateSessionDto, userId: string) {
        // Get next session number for this subject
        let sessionNumber = 1;
        if (dto.subjectId) {
            const lastSession = await this.prisma.session.findFirst({
                where: { subjectId: dto.subjectId },
                orderBy: { sessionNumber: 'desc' },
                select: { sessionNumber: true },
            });
            sessionNumber = (lastSession?.sessionNumber || 0) + 1;
        }

        return this.prisma.session.create({
            data: {
                title: dto.title,
                description: dto.description,
                domainId: dto.domainId,
                subjectId: dto.subjectId,
                sessionNumber,
                createdById: userId,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async findAll(domainId: string | undefined, userId: string, userRole: string) {
        // Super Admin sees all, Admin sees only their own sessions
        const whereClause: Record<string, unknown> = {};

        if (domainId) {
            whereClause.domainId = domainId;
        }

        if (userRole !== UserRole.SUPER_ADMIN) {
            whereClause.createdById = userId;
        }

        return this.prisma.session.findMany({
            where: whereClause,
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const session = await this.prisma.session.findUnique({
            where: { id },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
                attendances: {
                    include: {
                        user: { select: { id: true, email: true, firstName: true, lastName: true, prn: true } },
                    },
                    orderBy: { markedAt: 'desc' },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return session;
    }

    async update(id: string, dto: UpdateSessionDto) {
        await this.findById(id);

        return this.prisma.session.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async start(id: string) {
        const session = await this.findById(id);

        if (session.status === SessionStatus.ACTIVE) {
            throw new BadRequestException('Session is already active');
        }

        if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CANCELLED) {
            throw new BadRequestException('Cannot start a completed or cancelled session');
        }

        return this.prisma.session.update({
            where: { id },
            data: {
                status: SessionStatus.ACTIVE,
                phase: SessionPhase.ENTRY,
                startedAt: new Date(),
                rotationCounter: 0,
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async switchToExitPhase(id: string) {
        const session = await this.findById(id);

        if (session.status !== SessionStatus.ACTIVE) {
            throw new BadRequestException('Session is not active');
        }

        if (session.phase === SessionPhase.EXIT) {
            throw new BadRequestException('Session is already in exit phase');
        }

        return this.prisma.session.update({
            where: { id },
            data: {
                phase: SessionPhase.EXIT,
                rotationCounter: 0, // Reset counter for new phase
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async stop(id: string) {
        const session = await this.findById(id);

        if (session.status !== SessionStatus.ACTIVE) {
            throw new BadRequestException('Session is not active');
        }

        // Mark all pending attendances as ABSENT (missed entry or exit)
        await this.prisma.attendance.updateMany({
            where: {
                sessionId: id,
                status: AttendanceStatus.PENDING,
            },
            data: {
                status: AttendanceStatus.ABSENT,
            },
        });

        return this.prisma.session.update({
            where: { id },
            data: {
                status: SessionStatus.COMPLETED,
                endedAt: new Date(),
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async cancel(id: string) {
        const session = await this.findById(id);

        if (session.status === SessionStatus.COMPLETED) {
            throw new BadRequestException('Cannot cancel a completed session');
        }

        return this.prisma.session.update({
            where: { id },
            data: {
                status: SessionStatus.CANCELLED,
                endedAt: new Date(),
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { attendances: true } },
            },
        });
    }

    async delete(id: string) {
        await this.findById(id);
        await this.prisma.session.delete({ where: { id } });
    }

    async isActive(id: string): Promise<boolean> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            select: { status: true },
        });
        return session?.status === SessionStatus.ACTIVE;
    }

    async getPhase(id: string): Promise<string | null> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            select: { phase: true },
        });
        return session?.phase || null;
    }

    async incrementRotationCounter(id: string): Promise<number> {
        const session = await this.prisma.session.update({
            where: { id },
            data: { rotationCounter: { increment: 1 } },
            select: { rotationCounter: true },
        });
        return session.rotationCounter;
    }

    async getRotationCounter(id: string): Promise<number> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            select: { rotationCounter: true },
        });
        return session?.rotationCounter || 0;
    }

    // Get active sessions for a student's domain
    async getActiveSessionsForStudent(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { domainId: true },
        });

        if (!user?.domainId) {
            return [];
        }

        return this.prisma.session.findMany({
            where: {
                domainId: user.domainId,
                status: SessionStatus.ACTIVE,
            },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                _count: { select: { attendances: true } },
            },
            orderBy: { startedAt: 'desc' },
        });
    }
}
