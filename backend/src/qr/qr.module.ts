import { Module, forwardRef } from '@nestjs/common';
import { QrService } from './qr.service';
import { WsModule } from '../ws/ws.module';

@Module({
    imports: [forwardRef(() => WsModule)],
    providers: [QrService],
    exports: [QrService],
})
export class QrModule { }
