import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WsGateway } from '../ws/ws.gateway';

export interface TokenPayload {
    sid: string; // Session ID
    did: string; // Domain ID (shortened)
    iat: number; // Issued at (Unix timestamp in seconds)
    exp: number; // Expires at (Unix timestamp in seconds)
    rot: number; // Rotation counter
}

export interface ParsedToken {
    payload: TokenPayload;
    signature: string;
    raw: string;
}

@Injectable()
export class QrService {
    private readonly hmacSecret: string;
    private readonly tokenTtl: number;
    private rotationIntervals: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => WsGateway))
        private readonly wsGateway: WsGateway,
    ) {
        this.hmacSecret = this.configService.get<string>('HMAC_SECRET', 'default-hmac-secret');
        this.tokenTtl = this.configService.get<number>('QR_TTL_SECONDS', 30);
    }

    /**
     * Generate a signed token for a session
     * Token format: <base64_payload>.<hex_signature>
     */
    generateToken(sessionId: string, rotationCounter: number = 0, domainId: string = ''): string {
        const now = Math.floor(Date.now() / 1000);
        // Align iat to token TTL intervals for predictable rotation
        const iat = Math.floor(now / this.tokenTtl) * this.tokenTtl;
        const exp = iat + this.tokenTtl;

        const payload: TokenPayload = {
            sid: sessionId,
            did: domainId.substring(0, 8), // Shortened domain ID
            iat,
            exp,
            rot: rotationCounter,
        };

        const payloadStr = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
        const signature = this.sign(payloadBase64);

        return `${payloadBase64}.${signature}`;
    }

    /**
     * Parse and extract payload from token (without verification)
     */
    parseToken(token: string): ParsedToken | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 2) {
                return null;
            }

            const [payloadBase64, signature] = parts;
            const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
            const payload = JSON.parse(payloadStr) as TokenPayload;

            return {
                payload,
                signature,
                raw: payloadBase64,
            };
        } catch {
            return null;
        }
    }

    /**
     * Verify token signature and expiry
     */
    verifyToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
        const parsed = this.parseToken(token);

        if (!parsed) {
            return { valid: false, error: 'Invalid token format' };
        }

        // Verify signature
        const expectedSignature = this.sign(parsed.raw);
        if (!crypto.timingSafeEqual(Buffer.from(parsed.signature), Buffer.from(expectedSignature))) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Verify expiry
        const now = Math.floor(Date.now() / 1000);
        if (now > parsed.payload.exp) {
            return { valid: false, error: 'Token expired' };
        }

        // Check if token is not from the future (clock skew tolerance of 5 seconds)
        if (parsed.payload.iat > now + 5) {
            return { valid: false, error: 'Token issued in the future' };
        }

        return { valid: true, payload: parsed.payload };
    }

    /**
     * Create HMAC-SHA256 signature
     */
    private sign(data: string): string {
        return crypto.createHmac('sha256', this.hmacSecret).update(data).digest('hex');
    }

    /**
     * Start token rotation for a session
     * Broadcasts new tokens via WebSocket at regular intervals
     */
    startTokenRotation(sessionId: string, domainId: string = ''): void {
        // Stop any existing rotation for this session
        this.stopTokenRotation(sessionId);

        let rotationCounter = 0;

        // Generate and broadcast immediately
        const token = this.generateToken(sessionId, rotationCounter, domainId);
        this.wsGateway.broadcastToken(sessionId, token);

        // Set up interval for rotation
        const interval = setInterval(() => {
            rotationCounter++;
            const newToken = this.generateToken(sessionId, rotationCounter, domainId);
            this.wsGateway.broadcastToken(sessionId, newToken);
        }, this.tokenTtl * 1000);

        this.rotationIntervals.set(sessionId, interval);
    }

    /**
     * Stop token rotation for a session
     */
    stopTokenRotation(sessionId: string): void {
        const interval = this.rotationIntervals.get(sessionId);
        if (interval) {
            clearInterval(interval);
            this.rotationIntervals.delete(sessionId);
        }
    }

    /**
     * Get token TTL in seconds
     */
    getTokenTtl(): number {
        return this.tokenTtl;
    }
}
