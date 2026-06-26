/*
 * k6 reservation-contention load test (ADR-1 / ADR-2).
 *
 * Fires N virtual users at the SAME pair of seats at once and asserts that the atomic
 * `SELECT … FOR UPDATE` reserve path lets through exactly ONE winner — every other VU
 * must get a 4xx (seats unavailable). This is the load-scale counterpart of the
 * `reservation-concurrency` API test, and the scenario the scaling overlay
 * (docker-compose.scale.yml: 3 replicas + Redis adapter) is meant to survive.
 *
 *   Run against the default single-instance stack:
 *     k6 run scripts/load/reserve-contention.js
 *
 *   Run against the scaled stack (docker compose -f docker-compose.yml -f docker-compose.scale.yml up):
 *     BASE_URL=http://localhost VUS=50 k6 run scripts/load/reserve-contention.js
 *
 * Env:
 *   BASE_URL  gateway base URL           (default http://localhost)
 *   VUS       number of competing users  (default 30)
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const API = `${BASE_URL}/api/v1`;
const VUS = parseInt(__ENV.VUS || '30', 10);

const reserveWon = new Counter('reserve_won'); // 201 — the single winner
const reserveLost = new Counter('reserve_lost'); // 4xx — correctly rejected losers

export const options = {
    scenarios: {
        contention: {
            executor: 'per-vu-iterations',
            vus: VUS,
            iterations: 1,
            maxDuration: '60s',
        },
    },
    thresholds: {
        // The whole point: across all VUs, exactly one reservation may win.
        reserve_won: ['count==1'],
        reserve_lost: [`count==${VUS - 1}`],
    },
};

// Pick the first two seats of the first row — a safe, consecutive, non-isolating pair.
export function setup() {
    const res = http.get(`${API}/seats`);
    check(res, { 'seats listed': (r) => r.status === 200 });
    const seats = res.json('seats');
    const firstRow = seats.filter((s) => s.row === seats[0].row).sort((a, b) => a.number - b.number);
    return { seatIds: [firstRow[0].id, firstRow[1].id] };
}

function csrfHeader() {
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL(`${API}/`);
    const token = cookies.csrf_token ? cookies.csrf_token[0] : '';
    return { 'X-CSRF-Token': token, 'Content-Type': 'application/json' };
}

export default function (data) {
    // Each VU is a distinct user; register sets the auth + csrf cookies in this VU's jar.
    const email = `load_${__VU}_${Date.now()}@example.com`;
    const register = http.post(`${API}/auth/register`, JSON.stringify({ email, password: 'SecretPass1!' }), {
        headers: { 'Content-Type': 'application/json' },
    });
    check(register, { registered: (r) => r.status === 201 });

    // All VUs now hammer the same two seats simultaneously.
    const reserve = http.post(`${API}/reservations`, JSON.stringify({ seatIds: data.seatIds }), {
        headers: csrfHeader(),
    });

    if (reserve.status === 201) {
        reserveWon.add(1);
    } else {
        reserveLost.add(1);
        check(reserve, { 'loser rejected with 4xx': (r) => r.status >= 400 && r.status < 500 });
    }
}
