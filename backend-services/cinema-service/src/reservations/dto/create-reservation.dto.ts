import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateReservationDto {
    @IsArray({ message: 'seatIds must be an array' })
    @ArrayMinSize(1, { message: 'seatIds must contain at least 1 seat' })
    @ArrayMaxSize(10, { message: 'seatIds must contain at most 10 seats' })
    @IsUUID('4', { each: true, message: 'each seatId must be a valid UUID' })
    seatIds!: string[];
}
