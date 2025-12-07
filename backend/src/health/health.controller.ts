import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    async check() {
        const checks = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: 'unknown',
                redis: 'unknown',
            },
        };

        // Check database
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            checks.services.database = 'ok';
        } catch {
            checks.services.database = 'error';
            checks.status = 'degraded';
        }

        // Check Redis
        if (this.redis.isConnected()) {
            try {
                await this.redis.set('health-check', 'ok', 10);
                checks.services.redis = 'ok (connected)';
            } catch {
                checks.services.redis = 'error';
                checks.status = 'degraded';
            }
        } else {
            checks.services.redis = 'ok (in-memory fallback)';
        }

        return checks;
    }
}

