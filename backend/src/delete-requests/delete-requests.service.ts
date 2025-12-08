import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/types';

@Injectable()
export class DeleteRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async createRequest(
        type: 'SESSION' | 'SUBJECT',
        targetId: string,
        requesterId: string,
        reason?: string,
    ) {
        // Verify the target exists
        if (type === 'SESSION') {
            const session = await this.prisma.session.findUnique({ where: { id: targetId } });
            if (!session) throw new NotFoundException('Session not found');
        } else {
            const subject = await this.prisma.subject.findUnique({ where: { id: targetId } });
            if (!subject) throw new NotFoundException('Subject not found');
        }

        // Check if there's already a pending request
        const existing = await this.prisma.deleteRequest.findFirst({
            where: {
                status: 'PENDING',
                ...(type === 'SESSION' ? { sessionId: targetId } : { subjectId: targetId }),
            },
        });

        if (existing) {
            throw new BadRequestException('A delete request is already pending for this item');
        }

        return this.prisma.deleteRequest.create({
            data: {
                type,
                reason,
                requestedById: requesterId,
                ...(type === 'SESSION' ? { sessionId: targetId } : { subjectId: targetId }),
            },
            include: {
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                session: { select: { id: true, title: true } },
                subject: { select: { id: true, name: true } },
            },
        });
    }

    async getPendingRequests() {
        return this.prisma.deleteRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                session: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        subject: { select: { id: true, name: true } },
                    },
                },
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        _count: { select: { sessions: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllRequests() {
        return this.prisma.deleteRequest.findMany({
            include: {
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                approvedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                session: { select: { id: true, title: true } },
                subject: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async approveRequest(requestId: string, approverId: string, approverRole: string) {
        if (approverRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admin can approve delete requests');
        }

        const request = await this.prisma.deleteRequest.findUnique({
            where: { id: requestId },
            include: { session: true, subject: true },
        });

        if (!request) {
            throw new NotFoundException('Delete request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException('Request has already been processed');
        }

        // Update request status FIRST (before deleting target which cascades)
        const updatedRequest = await this.prisma.deleteRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedById: approverId,
            },
            include: {
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                approvedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        // Delete the target based on type (this will cascade delete the request too)
        if (request.type === 'SESSION' && request.sessionId) {
            await this.prisma.session.delete({ where: { id: request.sessionId } });
        } else if (request.type === 'SUBJECT' && request.subjectId) {
            await this.prisma.subject.delete({ where: { id: request.subjectId } });
        }

        return updatedRequest;
    }

    async denyRequest(requestId: string, approverId: string, approverRole: string) {
        if (approverRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admin can deny delete requests');
        }

        const request = await this.prisma.deleteRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new NotFoundException('Delete request not found');
        }

        if (request.status !== 'PENDING') {
            throw new BadRequestException('Request has already been processed');
        }

        return this.prisma.deleteRequest.update({
            where: { id: requestId },
            data: {
                status: 'DENIED',
                approvedById: approverId,
            },
            include: {
                requestedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                approvedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    async getMyRequests(userId: string) {
        return this.prisma.deleteRequest.findMany({
            where: { requestedById: userId },
            include: {
                session: { select: { id: true, title: true } },
                subject: { select: { id: true, name: true } },
                approvedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
