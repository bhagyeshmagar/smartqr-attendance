import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { QrModule } from '../qr/qr.module';
import { AnomalyModule } from '../anomaly/anomaly.module';
import { SessionsModule } from '../sessions/sessions.module';
import { WsModule } from '../ws/ws.module';

@Module({
    imports: [QrModule, AnomalyModule, SessionsModule, WsModule],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule { }
