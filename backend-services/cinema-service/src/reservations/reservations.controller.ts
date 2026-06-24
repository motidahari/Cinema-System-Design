import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { RemoteAuthGuard, AuthenticatedRequest } from '../infrastructure/guards/remote-auth.guard';
import { ReservationsService } from './service/reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('api/v1/reservations')
@UseGuards(RemoteAuthGuard)
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) {}

    // Endpoints return domain models (serialized via ReservationModel.toJSON) — never DTOs.
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async reserve(@Body() dto: CreateReservationDto, @Req() req: AuthenticatedRequest) {
        return this.reservationsService.reserve(req.user.userId, dto.seatIds);
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.OK)
    async confirm(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.reservationsService.confirm(id, req.user.userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<void> {
        await this.reservationsService.cancel(id, req.user.userId);
    }

    @Get('my')
    async getMyReservations(@Req() req: AuthenticatedRequest) {
        const reservations = await this.reservationsService.getMyReservations(req.user.userId);
        return { reservations };
    }
}
