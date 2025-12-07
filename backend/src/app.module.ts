import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { DomainsModule } from './domains/domains.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SessionsModule } from './sessions/sessions.module';
import { QrModule } from './qr/qr.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AnomalyModule } from './anomaly/anomaly.module';
import { WsModule } from './ws/ws.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { DeleteRequestsModule } from './delete-requests/delete-requests.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
        }),

        // Rate limiting
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => [
                {
                    ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
                    limit: config.get<number>('RATE_LIMIT_MAX', 100),
                },
            ],
        }),

        // Core modules
        PrismaModule,
        RedisModule,
        HealthModule,

        // Feature modules
        AuthModule,
        UsersModule,
        ProfileModule,
        DomainsModule,
        SubjectsModule,
        SessionsModule,
        QrModule,
        AttendanceModule,
        AnomalyModule,
        WsModule,
        JobsModule,
        DeleteRequestsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
