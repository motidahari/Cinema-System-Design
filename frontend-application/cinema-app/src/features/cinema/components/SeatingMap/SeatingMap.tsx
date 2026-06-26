import { Chip, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useSeats } from '../../hooks/useSeats';
import { useReservation } from '../../hooks/useReservation';
import { useSocket } from '../../hooks/useSocket';
import SeatGrid from '../SeatGrid';

export default function SeatingMap() {
    const { t } = useTranslation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { seatsByRow, isLoading } = useSeats();
    const { selectedSeatIds, selectSeat, deselectSeat, activeReservation } = useReservation();

    // Once the user holds an active reservation — a 15-minute pending hold or a confirmed
    // booking — seat selection is locked until they confirm or cancel it.
    const locked = activeReservation !== null;

    useSocket(isAuthenticated);

    if (isLoading) {
        return <CircularProgress aria-label="Loading seating map" />;
    }

    const rows = Object.keys(seatsByRow).sort();

    return (
        <div className="seating-map">
            <div className="seating-map__screen">{t('cinema.screen')}</div>

            {rows.map((row) => (
                <SeatGrid
                    key={row}
                    row={row}
                    seats={seatsByRow[row]}
                    selectedSeatIds={selectedSeatIds}
                    locked={locked}
                    onSeatSelect={selectSeat}
                    onSeatDeselect={deselectSeat}
                />
            ))}

            <div className="seating-map__legend">
                <Chip label={t('cinema.legend.available')} className="seating-map__legend-chip--available" />
                <Chip label={t('cinema.legend.selected')} className="seating-map__legend-chip--selected" />
                <Chip label={t('cinema.legend.reserved')} className="seating-map__legend-chip--reserved" />
                <Chip label={t('cinema.legend.booked')} className="seating-map__legend-chip--booked" />
            </div>
        </div>
    );
}
