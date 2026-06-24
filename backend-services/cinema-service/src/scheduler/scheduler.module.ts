import { Module } from '@nestjs/common';
import { SeatsModule } from '../seats/seats.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { GatewayModule } from '../gateway/gateway.module';
import { ReservationExpiryCron } from './reservation-expiry.cron';

@Module({
    imports: [SeatsModule, ReservationsModule, GatewayModule],
    providers: [ReservationExpiryCron],
})
export class SchedulerModule {}
