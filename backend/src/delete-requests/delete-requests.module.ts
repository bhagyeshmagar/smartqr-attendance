import { Module } from '@nestjs/common';
import { DeleteRequestsService } from './delete-requests.service';
import { DeleteRequestsController } from './delete-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [DeleteRequestsService],
    controllers: [DeleteRequestsController],
    exports: [DeleteRequestsService],
})
export class DeleteRequestsModule { }
