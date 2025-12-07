import { Module, forwardRef } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { QrModule } from '../qr/qr.module';

@Module({
    imports: [forwardRef(() => QrModule)],
    providers: [WsGateway],
    exports: [WsGateway],
})
export class WsModule { }
