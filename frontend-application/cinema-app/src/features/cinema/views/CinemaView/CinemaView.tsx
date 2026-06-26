import { useEffect } from 'react';
import { Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSeats } from '../../hooks/useSeats';
import { useToast } from '@/shared/hooks/useToast';
import { useReservationStore } from '../../stores/useReservationStore';
import SeatingMap from '../../components/SeatingMap';
import ReservationPanel from '../../components/ReservationPanel';

export default function CinemaView() {
    const { t } = useTranslation();
    const { availableCount, reservedCount, bookedCount } = useSeats();
    const { showToast } = useToast();
    const getMyReservations = useReservationStore((s) => s.getMyReservations);

    useEffect(() => {
        void getMyReservations()
            .then(() => {
                const activeReservation = useReservationStore.getState().activeReservation;
                if (activeReservation?.isPending) {
                    showToast(t('cinema.reservationRestored'), 'info');
                }
            })
            .catch(() => {
                const error = useReservationStore.getState().error;
                showToast(error ?? t('cinema.loadFailed'), 'error');
            });
    }, [getMyReservations, showToast, t]);

    return (
        <Box sx={{ display: 'flex', flex: 1, overflow: 'auto' }} data-testid="cinema-view">
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, marginBlockEnd: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={t('cinema.stats.available', { count: availableCount })}
                        color="success"
                        aria-label={`${availableCount} available seats`}
                    />
                    <Chip
                        label={t('cinema.stats.reserved', { count: reservedCount })}
                        color="warning"
                        aria-label={`${reservedCount} reserved seats`}
                    />
                    <Chip
                        label={t('cinema.stats.booked', { count: bookedCount })}
                        color="error"
                        aria-label={`${bookedCount} booked seats`}
                    />
                </Box>

                <SeatingMap />
            </Box>

            <ReservationPanel />
        </Box>
    );
}
