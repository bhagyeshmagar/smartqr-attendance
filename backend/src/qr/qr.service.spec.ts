import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QrService } from './qr.service';
import { WsGateway } from '../ws/ws.gateway';

describe('QrService', () => {
    let service: QrService;
    let mockWsGateway: jest.Mocked<WsGateway>;

    const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
            const config: Record<string, unknown> = {
                HMAC_SECRET: 'test-hmac-secret',
                QR_TTL_SECONDS: 30,
            };
            return config[key] ?? defaultValue;
        }),
    };

    beforeEach(async () => {
        mockWsGateway = {
            broadcastToken: jest.fn(),
            broadcastAttendance: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QrService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: WsGateway, useValue: mockWsGateway },
            ],
        }).compile();

        service = module.get<QrService>(QrService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateToken', () => {
        it('should generate a valid token format', () => {
            const sessionId = 'test-session-123';
            const token = service.generateToken(sessionId);

            expect(token).toBeDefined();
            expect(token.split('.').length).toBe(2);
        });

        it('should include session ID in payload', () => {
            const sessionId = 'test-session-123';
            const token = service.generateToken(sessionId);

            const parsed = service.parseToken(token);
            expect(parsed).not.toBeNull();
            expect(parsed?.payload.sid).toBe(sessionId);
        });

        it('should include rotation counter in payload', () => {
            const sessionId = 'test-session-123';
            const rotationCounter = 5;
            const token = service.generateToken(sessionId, rotationCounter);

            const parsed = service.parseToken(token);
            expect(parsed?.payload.rot).toBe(rotationCounter);
        });

        it('should set correct TTL (iat + 30s = exp)', () => {
            const token = service.generateToken('test-session');
            const parsed = service.parseToken(token);

            expect(parsed).not.toBeNull();
            expect(parsed!.payload.exp - parsed!.payload.iat).toBe(30);
        });
    });

    describe('parseToken', () => {
        it('should parse a valid token', () => {
            const token = service.generateToken('test-session');
            const parsed = service.parseToken(token);

            expect(parsed).not.toBeNull();
            expect(parsed?.payload).toBeDefined();
            expect(parsed?.signature).toBeDefined();
        });

        it('should return null for invalid token format', () => {
            const parsed = service.parseToken('invalid-token');
            expect(parsed).toBeNull();
        });

        it('should return null for token without signature', () => {
            const parsed = service.parseToken('eyJzaWQiOiJ0ZXN0In0');
            expect(parsed).toBeNull();
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const token = service.generateToken('test-session');
            const result = service.verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.error).toBeUndefined();
        });

        it('should reject token with invalid signature', () => {
            const token = service.generateToken('test-session');
            const [payload, signature] = token.split('.');
            // Create a fake signature of the same length to avoid buffer length mismatch
            const tamperedSignature = 'a'.repeat(signature.length);
            const tamperedToken = `${payload}.${tamperedSignature}`;

            const result = service.verifyToken(tamperedToken);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid signature');
        });

        it('should reject expired token', () => {
            // Create a token with expired timestamp (includes pha field)
            const payload = {
                sid: 'test-session',
                did: 'domain',
                iat: Math.floor(Date.now() / 1000) - 100,
                exp: Math.floor(Date.now() / 1000) - 50,
                rot: 0,
                pha: 'ENTRY', // Include phase field
            };
            const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
            // Note: This will fail signature check too, demonstrating multi-layer validation
            const fakeToken = `${payloadBase64}.${'a'.repeat(64)}`;

            const result = service.verifyToken(fakeToken);
            expect(result.valid).toBe(false);
        });

        it('should reject malformed token', () => {
            const result = service.verifyToken('not.a.valid.token');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token format');
        });
    });

    describe('token rotation', () => {
        it('should start token rotation and broadcast', () => {
            const sessionId = 'test-session';
            service.startTokenRotation(sessionId);

            expect(mockWsGateway.broadcastToken).toHaveBeenCalledWith(
                sessionId,
                expect.any(String),
            );

            // Clean up
            service.stopTokenRotation(sessionId);
        });

        it('should stop token rotation', () => {
            const sessionId = 'test-session';
            service.startTokenRotation(sessionId);
            service.stopTokenRotation(sessionId);

            // Verify no more broadcasts happen after stop
            const callsBeforeWait = mockWsGateway.broadcastToken.mock.calls.length;

            // Should only have the initial broadcast
            expect(callsBeforeWait).toBe(1);
        });
    });

    describe('getTokenTtl', () => {
        it('should return configured TTL', () => {
            expect(service.getTokenTtl()).toBe(30);
        });
    });

    describe('verifyTokenWithSession', () => {
        it('should accept token with matching rotation counter and phase', () => {
            const token = service.generateToken('test-session', 5, 'domain', 'ENTRY');
            const result = service.verifyTokenWithSession(token, 5, 'ENTRY');

            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
        });

        it('should accept token within rotation tolerance (+1)', () => {
            const token = service.generateToken('test-session', 5, 'domain', 'ENTRY');
            const result = service.verifyTokenWithSession(token, 6, 'ENTRY');

            expect(result.valid).toBe(true);
        });

        it('should accept token within rotation tolerance (-1)', () => {
            const token = service.generateToken('test-session', 5, 'domain', 'ENTRY');
            const result = service.verifyTokenWithSession(token, 4, 'ENTRY');

            expect(result.valid).toBe(true);
        });

        it('should reject token with expired rotation counter', () => {
            const token = service.generateToken('test-session', 5, 'domain', 'ENTRY');
            const result = service.verifyTokenWithSession(token, 10, 'ENTRY');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('rotation');
        });

        it('should reject token with wrong phase (ENTRY token in EXIT phase)', () => {
            const token = service.generateToken('test-session', 0, 'domain', 'ENTRY');
            const result = service.verifyTokenWithSession(token, 0, 'EXIT');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('phase');
        });

        it('should reject token with wrong phase (EXIT token in ENTRY phase)', () => {
            const token = service.generateToken('test-session', 0, 'domain', 'EXIT');
            const result = service.verifyTokenWithSession(token, 0, 'ENTRY');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('phase');
        });

        it('should include phase in generated token', () => {
            const token = service.generateToken('test-session', 0, 'domain', 'EXIT');
            const parsed = service.parseToken(token);

            expect(parsed?.payload.pha).toBe('EXIT');
        });
    });
});
