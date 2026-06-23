import { Controller, Get, UseGuards } from '@nestjs/common';
import { RemoteAuthGuard } from '../infrastructure/guards/remote-auth.guard';
import { SeatsService } from './service/seats.service';
import { SeatModel } from './domain-model/seat';

@Controller('api/v1/seats')
@UseGuards(RemoteAuthGuard)
export class SeatsController {
    constructor(private readonly seatsService: SeatsService) {}

    // Endpoints return domain models (serialized via SeatModel.toJSON) — never DTOs.
    @Get()
    async getSeatingMap(): Promise<{ seats: SeatModel[] }> {
        const seats = await this.seatsService.getSeatingMap();
        return { seats };
    }
}
