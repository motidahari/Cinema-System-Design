// React
import { useMemo } from 'react';

// MUI
import { Box, CircularProgress, Divider, Typography } from '@mui/material';

// i18n
import { useTranslation } from 'react-i18next';

// Stores
import { useCinemaStore } from '../../stores/useCinemaStore';

// Hooks
import { useReservation } from '../../hooks/useReservation';

// Components
import Button from '@/shared/components/Button';

// Styles
import './ReservationPanel.scss';

// Side panel that drives the reservation lifecycle:
//   • No active reservation → selected seats + "Reserve" button
//   • PENDING reservation   → countdown + "Confirm" / "Cancel"
//   • CONFIRMED reservation → success message
export default function ReservationPanel() {
    const { t } = useTranslation();

    const { selectedSeatIds, activeReservation, isLoading, countdown, reserve, confirm, cancel, clearSelection } =
        useReservation();

    const seats = useCinemaStore((s) => s.seats);

    const selectedSeats = useMemo(() => seats.filter((s) => selectedSeatIds.has(s.id)), [seats, selectedSeatIds]);

    // Map seat id → human-readable label (e.g. "A7") so reservation chips show the
    // row + seat number instead of the raw seat id.
    const seatLabelById = useMemo(() => new Map(seats.map((s) => [s.id, s.label])), [seats]);
    const labelForSeat = (id: string): string => seatLabelById.get(id) ?? id;

    const minutes = Math.floor(countdown / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (countdown % 60).toString().padStart(2, '0');
    const isUrgent = countdown > 0 && countdown < 60;

    const handleReserve = (): void => {
        void reserve({ seatIds: Array.from(selectedSeatIds) });
    };

    const handleConfirm = (): void => {
        if (!activeReservation) return;
        void confirm({ reservationId: activeReservation.id });
    };

    const handleCancel = (): void => {
        // The server cancels every active reservation the caller owns from the auth
        // context, so no id is sent.
        void cancel({});
    };

    return (
        <Box className="reservation-panel" role="complementary" aria-label="Reservation panel">
            {activeReservation?.isConfirmed ? (
                /* ── Confirmed state ──────────────────────────────── */
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        py: 3,
                    }}
                >
                    <Typography variant="h4" role="img" aria-label="confirmed">
                        &#10003;
                    </Typography>
                    <Typography variant="h6" align="center" color="success.main" fontWeight={700}>
                        {t('reservation.confirmed')}
                    </Typography>
                    <Divider sx={{ width: '100%' }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {activeReservation.seatIds.map((id) => (
                            <Box
                                key={id}
                                sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    bgcolor: 'success.light',
                                    color: 'success.contrastText',
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                {labelForSeat(id)}
                            </Box>
                        ))}
                    </Box>

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleCancel}
                        loading={isLoading}
                        fullWidth
                        aria-label={t('reservation.cancelBooking')}
                    >
                        {t('reservation.cancelBooking')}
                    </Button>
                </Box>
            ) : activeReservation?.isPending ? (
                /* ── Pending (hold) state ─────────────────────────── */
                <>
                    <Box
                        className={`reservation-panel__timer${isUrgent ? ' reservation-panel__timer--urgent' : ''}`}
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <Typography variant="body2">{t('reservation.expiresIn')}</Typography>
                        <Typography variant="h5" component="strong" fontWeight={700} fontFamily="monospace">
                            {minutes}:{seconds}
                        </Typography>
                    </Box>

                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                            {t('reservation.selectedCount', { count: activeReservation.seatCount })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {activeReservation.seatIds.map((id) => (
                                <Box
                                    key={id}
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        bgcolor: 'warning.light',
                                        color: 'warning.contrastText',
                                        fontSize: 13,
                                        fontWeight: 600,
                                    }}
                                >
                                    {labelForSeat(id)}
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleConfirm}
                        loading={isLoading}
                        fullWidth
                        aria-label={t('reservation.confirm')}
                    >
                        {t('reservation.confirm')}
                    </Button>

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleCancel}
                        loading={isLoading}
                        fullWidth
                        aria-label={t('reservation.cancel')}
                    >
                        {t('reservation.cancel')}
                    </Button>
                </>
            ) : (
                /* ── Selection state (no active reservation) ─────── */
                <>
                    <Box className="reservation-panel__selection" aria-live="polite">
                        {selectedSeats.length === 0 ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    py: 2,
                                    color: 'text.secondary',
                                }}
                            >
                                <Typography variant="body2" align="center">
                                    {t('reservation.selectSeats')}
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {t('reservation.selectedCount', { count: selectedSeats.length })}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                    {selectedSeats.map((seat) => (
                                        <Box
                                            key={seat.id}
                                            sx={{
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: 'primary.light',
                                                color: 'primary.contrastText',
                                                fontSize: 13,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {seat.label}
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>

                    {selectedSeats.length > 0 && (
                        <>
                            <Button
                                variant="contained"
                                onClick={handleReserve}
                                loading={isLoading}
                                fullWidth
                                aria-label={t('reservation.reserve')}
                            >
                                {isLoading ? <CircularProgress size={20} /> : t('reservation.reserve')}
                            </Button>

                            <Button
                                variant="text"
                                onClick={clearSelection}
                                disabled={isLoading}
                                fullWidth
                                aria-label={t('reservation.clearSelection')}
                            >
                                {t('reservation.clearSelection')}
                            </Button>
                        </>
                    )}
                </>
            )}
        </Box>
    );
}
