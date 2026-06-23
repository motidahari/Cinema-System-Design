import { Module } from '@nestjs/common';
import { SeatsModule } from '../seats/seats.module';
import { SeatSeederService } from './seat-seeder.service';

@Module({
    imports: [SeatsModule],
    providers: [SeatSeederService],
    exports: [SeatSeederService],
})
export class SeedModule {}
