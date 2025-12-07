import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { AnomalyService } from '../anomaly/anomaly.service';
import { SessionsService } from '../sessions/sessions.service';
import { WsGateway } from '../ws/ws.gateway';

describe('AttendanceService', () => {
    let service: AttendanceService;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
    };

    const mockSession = {
        id: 'session-123',
        domainId: 'domain-123',
    };

    const mockMeta = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFp: 'fp-123',
    };

    const mockPrismaService = {
        session: {
            findUnique: jest.fn(),
        },
        attendance: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };

    const mockQrService = {
        verifyToken: jest.fn(),
        getTokenTtl: jest.fn().mockReturnValue(30),
    };

    const mockAnomalyService = {
        checkAndRecordTokenUsage: jest.fn(),
    };

    const mockSessionsService = {
        isActive: jest.fn(),
    };

    const mockWsGateway = {
        broadcastAttendance: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendanceService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: QrService, useValue: mockQrService },
                { provide: AnomalyService, useValue: mockAnomalyService },
                { provide: SessionsService, useValue: mockSessionsService },
                { provide: WsGateway, useValue: mockWsGateway },
            ],
        }).compile();

        service = module.get<AttendanceService>(AttendanceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('markAttendance', () => {
        const validToken = 'valid-token';
        const validPayload = {
            sid: 'session-123',
            did: 'domain-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 30,
            rot: 0,
        };

        it('should successfully mark attendance with valid token', async () => {
            mockQrService.verifyToken.mockReturnValue({
                valid: true,
                payload: validPayload,
            });
            mockSessionsService.isActive.mockResolvedValue(true);
            mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
            mockAnomalyService.checkAndRecordTokenUsage.mockResolvedValue(false);
            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                sessionId: 'session-123',
                userId: 'user-123',
                markedAt: new Date(),
                tokenIat: new Date(validPayload.iat * 1000),
                tokenExp: new Date(validPayload.exp * 1000),
                ip: mockMeta.ip,
                userAgent: mockMeta.userAgent,
                deviceFp: mockMeta.deviceFp,
                verificationFlags: null,
                user: mockUser,
            });

            const result = await service.markAttendance(
                mockUser.id,
                { token: validToken },
                mockMeta,
            );

            expect(result.success).toBe(true);
            expect(result.message).toBe('Attendance marked successfully');
            expect(mockWsGateway.broadcastAttendance).toHaveBeenCalled();
        });

        it('should reject invalid token', async () => {
            mockQrService.verifyToken.mockReturnValue({
                valid: false,
                error: 'Invalid signature',
            });

            await expect(
                service.markAttendance(mockUser.id, { token: 'invalid' }, mockMeta),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject if session is not active', async () => {
            mockQrService.verifyToken.mockReturnValue({
                valid: true,
                payload: validPayload,
            });
            mockSessionsService.isActive.mockResolvedValue(false);

            await expect(
                service.markAttendance(mockUser.id, { token: validToken }, mockMeta),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw conflict for duplicate attendance', async () => {
            mockQrService.verifyToken.mockReturnValue({
                valid: true,
                payload: validPayload,
            });
            mockSessionsService.isActive.mockResolvedValue(true);
            mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
            mockAnomalyService.checkAndRecordTokenUsage.mockResolvedValue(false);
            mockPrismaService.attendance.create.mockRejectedValue({ code: 'P2002' });

            await expect(
                service.markAttendance(mockUser.id, { token: validToken }, mockMeta),
            ).rejects.toThrow(ConflictException);
        });

        it('should flag attendance for geo-dispersion', async () => {
            mockQrService.verifyToken.mockReturnValue({
                valid: true,
                payload: validPayload,
            });
            mockSessionsService.isActive.mockResolvedValue(true);
            mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
            mockAnomalyService.checkAndRecordTokenUsage.mockResolvedValue(true); // Flagged!

            mockPrismaService.attendance.create.mockResolvedValue({
                id: 'attendance-123',
                sessionId: 'session-123',
                userId: 'user-123',
                markedAt: new Date(),
                tokenIat: new Date(validPayload.iat * 1000),
                tokenExp: new Date(validPayload.exp * 1000),
                ip: mockMeta.ip,
                userAgent: mockMeta.userAgent,
                deviceFp: mockMeta.deviceFp,
                verificationFlags: { flagged: true, reason: 'geo-dispersion' },
                user: mockUser,
            });

            const result = await service.markAttendance(
                mockUser.id,
                { token: validToken, geo: { country: 'US' } },
                { ...mockMeta, geo: { country: 'US' } },
            );

            expect(result.message).toContain('verification flag');
        });
    });

    describe('getBySession', () => {
        it('should return attendance records for a session', async () => {
            const mockAttendances = [
                { id: '1', userId: 'user-1', user: mockUser },
                { id: '2', userId: 'user-2', user: { ...mockUser, id: 'user-2' } },
            ];
            mockPrismaService.attendance.findMany.mockResolvedValue(mockAttendances);

            const result = await service.getBySession('session-123');

            expect(result).toHaveLength(2);
            expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith({
                where: { sessionId: 'session-123' },
                include: expect.any(Object),
                orderBy: { markedAt: 'desc' },
            });
        });
    });

    describe('getByUser', () => {
        it('should return attendance records for a user', async () => {
            const mockAttendances = [
                { id: '1', sessionId: 'session-1', session: { title: 'Session 1' } },
            ];
            mockPrismaService.attendance.findMany.mockResolvedValue(mockAttendances);

            const result = await service.getByUser('user-123');

            expect(result).toHaveLength(1);
            expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                include: expect.any(Object),
                orderBy: { markedAt: 'desc' },
            });
        });
    });
});
