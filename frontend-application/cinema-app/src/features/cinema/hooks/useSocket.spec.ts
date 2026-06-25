import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocket } from './useSocket';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('../stores/useCinemaStore', () => ({ useCinemaStore: vi.fn() }));

import { io } from 'socket.io-client';
import { useCinemaStore } from '../stores/useCinemaStore';

const ioMock = io as unknown as ReturnType<typeof vi.fn>;
const useCinemaStoreMock = useCinemaStore as unknown as ReturnType<typeof vi.fn>;

type Handler = (...args: unknown[]) => void;

const updateSeatsStatus = vi.fn();
const getSeatingMap = vi.fn();

let socketHandlers: Record<string, Handler>;
let managerHandlers: Record<string, Handler>;
let fakeSocket: {
    id: string;
    on: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    io: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};
    managerHandlers = {};
    fakeSocket = {
        id: 'sock-1',
        on: vi.fn((event: string, cb: Handler) => {
            socketHandlers[event] = cb;
        }),
        disconnect: vi.fn(),
        io: {
            on: vi.fn((event: string, cb: Handler) => {
                managerHandlers[event] = cb;
            }),
            off: vi.fn(),
        },
    };
    ioMock.mockReturnValue(fakeSocket);

    const state = { updateSeatsStatus, getSeatingMap };
    useCinemaStoreMock.mockImplementation((selector: (s: typeof state) => unknown) => selector(state));
});

describe('useSocket', () => {
    it('does not connect while unauthenticated', () => {
        renderHook(() => useSocket(false));

        expect(ioMock).not.toHaveBeenCalled();
    });

    it('connects with credentials to the configured socket URL when authenticated', () => {
        renderHook(() => useSocket(true));

        expect(ioMock).toHaveBeenCalledTimes(1);
        const [, options] = ioMock.mock.calls[0];
        expect(options).toMatchObject({ withCredentials: true });
    });

    it('patches reserved seats to RESERVED on a seat:reserved event', () => {
        renderHook(() => useSocket(true));

        socketHandlers['seat:reserved']({ seats: [{ id: 'seat-A1' }, { id: 'seat-A2' }] });

        expect(updateSeatsStatus).toHaveBeenCalledWith(['seat-A1', 'seat-A2'], 'RESERVED');
    });

    it('patches booked seats to BOOKED on a seat:booked event', () => {
        renderHook(() => useSocket(true));

        socketHandlers['seat:booked']({ seats: [{ id: 'seat-A1' }] });

        expect(updateSeatsStatus).toHaveBeenCalledWith(['seat-A1'], 'BOOKED');
    });

    it('patches released seats to AVAILABLE on a seat:released event', () => {
        renderHook(() => useSocket(true));

        socketHandlers['seat:released']({ seats: [{ id: 'seat-A1' }] });

        expect(updateSeatsStatus).toHaveBeenCalledWith(['seat-A1'], 'AVAILABLE');
    });

    it('resyncs the full seating map on reconnect', () => {
        renderHook(() => useSocket(true));

        managerHandlers['reconnect']();

        expect(getSeatingMap).toHaveBeenCalledTimes(1);
    });

    it('disconnects and removes the reconnect listener on unmount', () => {
        const { unmount } = renderHook(() => useSocket(true));

        unmount();

        expect(fakeSocket.io.off).toHaveBeenCalledWith('reconnect');
        expect(fakeSocket.disconnect).toHaveBeenCalledTimes(1);
    });
});
