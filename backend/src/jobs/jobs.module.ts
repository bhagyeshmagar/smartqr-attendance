import { Module, Logger } from '@nestjs/common';

/**
 * Jobs module - disabled for local development without Redis
 * BullMQ requires Redis, so we provide an empty module for in-memory development
 */
@Module({
    imports: [],
    providers: [],
    exports: [],
})
export class JobsModule {
    private readonly logger = new Logger(JobsModule.name);

    constructor() {
        this.logger.warn('Jobs module disabled - Redis not available for BullMQ');
    }
}
