import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UserRole } from '../common/types';

@Injectable()
export class SubjectsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateSubjectDto, userId: string) {
        return this.prisma.subject.create({
            data: {
                name: dto.name,
                code: dto.code,
                description: dto.description,
                domainId: dto.domainId,
                createdById: userId,
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { sessions: true } },
            },
        });
    }

    async findAll(domainId: string | undefined, userId: string, userRole: string) {
        // Super Admin sees all, Admin sees only their own subjects
        const whereClause: Record<string, unknown> = {};

        if (domainId) {
            whereClause.domainId = domainId;
        }

        if (userRole !== UserRole.SUPER_ADMIN) {
            whereClause.createdById = userId;
        }

        return this.prisma.subject.findMany({
            where: whereClause,
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                _count: { select: { sessions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
                sessions: {
                    orderBy: { sessionNumber: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        phase: true,
                        sessionNumber: true,
                        startedAt: true,
                        endedAt: true,
                        createdAt: true,
                        _count: { select: { attendances: true } },
                    },
                },
            },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        return subject;
    }

    async update(id: string, data: Partial<CreateSubjectDto>) {
        await this.findById(id);

        return this.prisma.subject.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                description: data.description,
            },
            include: {
                domain: { select: { id: true, name: true, slug: true } },
                _count: { select: { sessions: true } },
            },
        });
    }

    async delete(id: string) {
        await this.findById(id);
        await this.prisma.subject.delete({ where: { id } });
    }

    async getNextSessionNumber(subjectId: string): Promise<number> {
        const lastSession = await this.prisma.session.findFirst({
            where: { subjectId },
            orderBy: { sessionNumber: 'desc' },
            select: { sessionNumber: true },
        });

        return (lastSession?.sessionNumber || 0) + 1;
    }
}
