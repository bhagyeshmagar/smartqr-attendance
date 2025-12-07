import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis service that connects to real Redis in production (Upstash)
 * and falls back to in-memory store for local development
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly store = new Map<string, { value: string | Set<string>; expiresAt?: number }>();
    private client: Redis | null = null;
    private useInMemory = true;

    constructor(private readonly configService: ConfigService) {
        const redisUrl = this.configService.get<string>('REDIS_URL');

        if (redisUrl && redisUrl !== 'redis://localhost:6379') {
            try {
                this.client = new Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
                });

                this.client.on('connect', () => {
                    this.logger.log('Connected to Redis (Upstash)');
                    this.useInMemory = false;
                });

                this.client.on('error', (err) => {
                    this.logger.warn(`Redis connection error: ${err.message}. Falling back to in-memory store.`);
                    this.useInMemory = true;
                });
            } catch (error) {
                this.logger.warn('Failed to initialize Redis client. Using in-memory store.');
                this.useInMemory = true;
            }
        } else {
            this.logger.log('Using in-memory store (no Redis URL configured)');
        }
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
        this.store.clear();
    }

    private isExpired(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return true;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return true;
        }
        return false;
    }

    getClient(): Redis | null {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        if (!this.useInMemory && this.client) {
            return this.client.get(key);
        }
        if (this.isExpired(key)) return null;
        const entry = this.store.get(key);
        return typeof entry?.value === 'string' ? entry.value : null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (!this.useInMemory && this.client) {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, value);
            }
            return;
        }
        this.store.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
        });
    }

    async del(key: string): Promise<void> {
        if (!this.useInMemory && this.client) {
            await this.client.del(key);
            return;
        }
        this.store.delete(key);
    }

    async sadd(key: string, ...members: string[]): Promise<number> {
        if (!this.useInMemory && this.client) {
            return this.client.sadd(key, ...members);
        }
        if (this.isExpired(key)) {
            this.store.set(key, { value: new Set<string>() });
        }
        const entry = this.store.get(key);
        if (!(entry?.value instanceof Set)) {
            this.store.set(key, { value: new Set<string>(members) });
            return members.length;
        }
        let added = 0;
        for (const member of members) {
            if (!entry.value.has(member)) {
                entry.value.add(member);
                added++;
            }
        }
        return added;
    }

    async scard(key: string): Promise<number> {
        if (!this.useInMemory && this.client) {
            return this.client.scard(key);
        }
        if (this.isExpired(key)) return 0;
        const entry = this.store.get(key);
        return entry?.value instanceof Set ? entry.value.size : 0;
    }

    async smembers(key: string): Promise<string[]> {
        if (!this.useInMemory && this.client) {
            return this.client.smembers(key);
        }
        if (this.isExpired(key)) return [];
        const entry = this.store.get(key);
        return entry?.value instanceof Set ? Array.from(entry.value) : [];
    }

    async expire(key: string, seconds: number): Promise<void> {
        if (!this.useInMemory && this.client) {
            await this.client.expire(key, seconds);
            return;
        }
        const entry = this.store.get(key);
        if (entry) {
            entry.expiresAt = Date.now() + seconds * 1000;
        }
    }

    async incr(key: string): Promise<number> {
        if (!this.useInMemory && this.client) {
            return this.client.incr(key);
        }
        const current = await this.get(key);
        const newValue = (parseInt(current || '0', 10) + 1).toString();
        await this.set(key, newValue);
        return parseInt(newValue, 10);
    }

    async hset(key: string, field: string, value: string): Promise<void> {
        if (!this.useInMemory && this.client) {
            await this.client.hset(key, field, value);
            return;
        }
        const existing = await this.get(key);
        const obj = existing ? JSON.parse(existing) : {};
        obj[field] = value;
        await this.set(key, JSON.stringify(obj));
    }

    async hget(key: string, field: string): Promise<string | null> {
        if (!this.useInMemory && this.client) {
            return this.client.hget(key, field);
        }
        const existing = await this.get(key);
        if (!existing) return null;
        const obj = JSON.parse(existing);
        return obj[field] || null;
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        if (!this.useInMemory && this.client) {
            return this.client.hgetall(key);
        }
        const existing = await this.get(key);
        if (!existing) return {};
        return JSON.parse(existing);
    }

    async exists(key: string): Promise<boolean> {
        if (!this.useInMemory && this.client) {
            return (await this.client.exists(key)) === 1;
        }
        return !this.isExpired(key) && this.store.has(key);
    }

    async ttl(key: string): Promise<number> {
        if (!this.useInMemory && this.client) {
            return this.client.ttl(key);
        }
        const entry = this.store.get(key);
        if (!entry || !entry.expiresAt) return -1;
        return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
    }

    isConnected(): boolean {
        return !this.useInMemory && this.client !== null;
    }
}

