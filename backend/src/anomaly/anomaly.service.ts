import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface TokenUsageData {
    ip: string;
    deviceFp: string;
    country: string;
}

export interface TokenStats {
    ips: string[];
    devices: string[];
    countries: string[];
    scanCount: number;
}

@Injectable()
export class AnomalyService {
    private readonly GEO_DISPERSION_THRESHOLD = 3; // Flag if 3+ distinct countries

    constructor(private readonly redis: RedisService) { }

    /**
     * Record token usage and check for anomalies
     * Returns true if the token usage should be flagged
     */
    async checkAndRecordTokenUsage(
        token: string,
        data: TokenUsageData,
        ttlSeconds: number,
    ): Promise<boolean> {
        const tokenHash = this.hashToken(token);
        const baseKey = `token_stats:${tokenHash}`;

        // Add to sets for IPs, devices, and countries
        await Promise.all([
            this.redis.sadd(`${baseKey}:ips`, data.ip),
            this.redis.sadd(`${baseKey}:devices`, data.deviceFp),
            this.redis.sadd(`${baseKey}:countries`, data.country),
            this.redis.incr(`${baseKey}:count`),
        ]);

        // Set expiry on all keys
        await Promise.all([
            this.redis.expire(`${baseKey}:ips`, ttlSeconds + 60),
            this.redis.expire(`${baseKey}:devices`, ttlSeconds + 60),
            this.redis.expire(`${baseKey}:countries`, ttlSeconds + 60),
            this.redis.expire(`${baseKey}:count`, ttlSeconds + 60),
        ]);

        // Check for geo-dispersion
        const countryCount = await this.redis.scard(`${baseKey}:countries`);
        return countryCount >= this.GEO_DISPERSION_THRESHOLD;
    }

    /**
     * Get statistics for a token
     */
    async getTokenStats(token: string): Promise<TokenStats> {
        const tokenHash = this.hashToken(token);
        const baseKey = `token_stats:${tokenHash}`;

        const [ips, devices, countries, countStr] = await Promise.all([
            this.redis.smembers(`${baseKey}:ips`),
            this.redis.smembers(`${baseKey}:devices`),
            this.redis.smembers(`${baseKey}:countries`),
            this.redis.get(`${baseKey}:count`),
        ]);

        return {
            ips,
            devices,
            countries,
            scanCount: parseInt(countStr || '0', 10),
        };
    }

    /**
     * Check if a token should be flagged without recording new usage
     */
    async checkForAnomaly(token: string): Promise<{
        flagged: boolean;
        reason?: string;
        stats: TokenStats;
    }> {
        const stats = await this.getTokenStats(token);

        if (stats.countries.length >= this.GEO_DISPERSION_THRESHOLD) {
            return {
                flagged: true,
                reason: 'geo-dispersion',
                stats,
            };
        }

        return { flagged: false, stats };
    }

    /**
     * Create a short hash of the token for use as Redis key
     */
    private hashToken(token: string): string {
        // Use first 16 chars of base64 payload for brevity
        // In production, use proper hashing
        return token.split('.')[0].substring(0, 16);
    }
}
