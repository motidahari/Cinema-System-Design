import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationEntity } from '../domain/entities/reservation.entity';
import { ReservationSeatEntity } from '../domain/entities/reservation-seat.entity';
import { IdempotencyKeyEntity } from '../domain/entities/idempotency-key.entity';
import { AppConfigModule } from '../infrastructure/config/app-config.module';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { RemoteAuthGuard } from '../infrastructure/guards/remote-auth.guard';
import { SeatsModule } from '../seats/seats.module';
import { GatewayModule } from '../gateway/gateway.module';
import { ReservationDao } from './dao/reservation.dao';
import { ReservationSeatDao } from './dao/reservation-seat.dao';
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './reservations.controller';
import { IdempotencyDao } from './idempotency/idempotency.dao';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

@Module({
    imports: [
        TypeOrmModule.forFeature([ReservationEntity, ReservationSeatEntity, IdempotencyKeyEntity]),
        AppConfigModule,
        DatabaseModule,
        SeatsModule,
        GatewayModule,
    ],
    controllers: [ReservationsController],
    providers: [
        ReservationDao,
        ReservationSeatDao,
        ReservationsService,
        RemoteAuthGuard,
        IdempotencyDao,
        IdempotencyInterceptor,
    ],
    exports: [ReservationDao, ReservationSeatDao],
})
export class ReservationsModule {}
