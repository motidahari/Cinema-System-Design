import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BaseCronJob, Logger } from '@cinema/shared';
import { SeatStatus } from '../seats/enum/seat-status.enum';
import { SeatDao } from '../seats/dao/seat.dao';
import { ReservationDao } from '../reservations/dao/reservation.dao';
import { ReservationSeatDao } from '../reservations/dao/reservation-seat.dao';
import { ReservationStatus } from '../reservations/enum/reservation-status.enum';
import { SeatGateway } from '../gateway/seat.gateway';

@Injectable()
export class ReservationExpiryCron extends BaseCronJob {
    private static readonly EXPIRY_LOCK_KEY = 491_001;

    constructor(
        private readonly reservationDao: ReservationDao,
        private readonly reservationSeatDao: ReservationSeatDao,
        private readonly seatDao: SeatDao,
        private readonly seatGateway: SeatGateway,
        private readonly dataSource: DataSource
    ) {
        super();
    }

    // Runs every minute (ADR-7: ≤60 s staleness window)
    @Cron('* * * * *')
    async releaseExpired(): Promise<void> {
        await this.runWithGuard('ReservationExpiryCron', async () => {
            const lockConn = this.dataSource.createQueryRunner();
            await lockConn.connect();
            try {
                const [{ locked }] = await lockConn.query('SELECT pg_try_advisory_lock($1) AS locked', [
                    ReservationExpiryCron.EXPIRY_LOCK_KEY,
                ]);
                if (!locked) {
                    Logger.info('Expiry cron: another instance holds the lock, skipping tick');
                    return;
                }

                const expired = await this.reservationDao.findExpiredPending();
                if (expired.length === 0) return;

                Logger.info('Expiry cron: releasing reservations', { count: expired.length });

                for (const reservation of expired) {
                    const qr = this.dataSource.createQueryRunner();
                    await qr.connect();
                    await qr.startTransaction();
                    try {
                        await this.reservationDao.updateStatus(qr, reservation.id, ReservationStatus.EXPIRED);
                        await this.seatDao.updateStatusBatch(qr, reservation.seatIds, SeatStatus.AVAILABLE);
                        await this.reservationSeatDao.deactivateByReservation(qr, reservation.id);
                        await qr.commitTransaction();

                        void this.seatDao
                            .findByIds(reservation.seatIds)
                            .then((seats) => this.seatGateway.emitSeatReleased(seats))
                            .catch((err) =>
                                Logger.error('Failed to emit seat:released', { reservationId: reservation.id, err })
                            );

                        Logger.info('Reservation expired', { reservationId: reservation.id });
                    } catch (err) {
                        await qr.rollbackTransaction();
                        Logger.error('Failed to expire reservation', {
                            reservationId: reservation.id,
                            error: String(err),
                        });
                    } finally {
                        await qr.release();
                    }
                }
            } finally {
                await lockConn.query('SELECT pg_advisory_unlock($1)', [ReservationExpiryCron.EXPIRY_LOCK_KEY]);
                await lockConn.release();
            }
        });
    }
}
