import { Module } from '@nestjs/common';
import { AppConfigModule } from '../infrastructure/config/app-config.module';
import { SeatGateway } from './seat.gateway';

@Module({
    imports: [AppConfigModule],
    providers: [SeatGateway],
    exports: [SeatGateway],
})
export class GatewayModule {}
