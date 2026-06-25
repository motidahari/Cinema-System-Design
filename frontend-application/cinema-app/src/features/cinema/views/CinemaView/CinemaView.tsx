// React
import { useEffect } from 'react';

// MUI
import { Alert, Box, Chip, Snackbar } from '@mui/material';

// i18n
import { useTranslation } from 'react-i18next';

// Hooks
import { useSeats } from '../../hooks/useSeats';
import { useToast } from '@/shared/hooks/useToast';
import { useReservationStore } from '../../stores/useReservationStore';

// Components
import SeatingMap from '../../components/SeatingMap';
import ReservationPanel from '../../components/ReservationPanel';

// The root cinema page (FRONTEND-DESIGN §13 + Routing §8):
//   Left column  → seat-count chips + SeatingMap (scrollable)
//   Right column → ReservationPanel (sticky side panel)
//   Global toast → useToast-driven Snackbar anchored bottom-center
//
// useSocket is called inside SeatingMap so the realtime connection is scoped to the
// time the map is mounted; CinemaView stays free of socket wiring.
export default function CinemaView() {
    const { t } = useTranslation();
    const { availableCount, reservedCount, bookedCount } = useSeats();
    const { toast, showToast, closeToast } = useToast();
    const getMyReservations = useReservationStore((s) => s.getMyReservations);

    useEffect(() => {
        void getMyReservations()
            .then(() => {
                const activeReservation = useReservationStore.getState().activeReservation;
                if (activeReservation?.isPending) {
                    showToast('Active reservation restored. You can confirm or cancel it.', 'info');
                }
            })
            .catch(() => {
                const error = useReservationStore.getState().error;
                showToast(error ?? 'Failed to load reservations', 'error');
            });
    }, [getMyReservations, showToast]);

    return (
        <Box sx={{ display: 'flex', flex: 1, overflow: 'auto' }} data-testid="cinema-view">
            {/* ── Left: seating map ───────────────────────────────────── */}
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

            {/* ── Right: reservation controls ─────────────────────────── */}
            <ReservationPanel />

            {/* ── Global toast ────────────────────────────────────────── */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={closeToast}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={closeToast} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
