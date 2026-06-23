import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatEntity } from '../domain/entities/seat.entity';
import { AppConfigModule } from '../infrastructure/config/app-config.module';
import { RemoteAuthGuard } from '../infrastructure/guards/remote-auth.guard';
import { SeatDao } from './dao/seat.dao';
import { SeatsService } from './service/seats.service';
import { SeatsController } from './seats.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SeatEntity]), AppConfigModule],
    controllers: [SeatsController],
    providers: [SeatDao, SeatsService, RemoteAuthGuard],
    exports: [SeatDao],
})
export class SeatsModule {}
