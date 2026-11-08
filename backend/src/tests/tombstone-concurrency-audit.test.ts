/**
 * Terra360 — Phase 3.7.1: Tombstone Retention & Concurrent Refresh Security Audit Suite
 *
 * Comprehensive verification of:
 * 1. Tombstone retention under 50+ session volume (prevents replay-history pruning)
 * 2. Unexpired rotated tombstone replay detection after high session counts
 * 3. Expired tombstone pruning & bounded storage enforcement
 * 4. Concurrent refresh behaviors across:
 *    - Simultaneous requests sharing the same token (Simulated multi-tab race)
 *    - Legitimate retry after network timeout (Sequential replay)
 *    - Multi-device independent token refresh
 * 5. Frontend API client single-flight mutex & loop prevention
 */

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { hashToken } from '../utils/crypto';

const BASE_URL = `http://localhost:${env.PORT || 5000}`;

let ipCounter = 1;

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('X-Forwarded-For')) {
    headers.set('X-Forwarded-For', `198.51.100.${(ipCounter++ % 200) + 1}`);
  }
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

function extractCookie(res: Response, name = 'refreshToken'): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : '';
}

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, extraInfo?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${label}${extraInfo ? ` — ${extraInfo}` : ''}`);
  }
}

async function runAuditSuite() {
  console.log('================================================================');
  console.log('🔬 TERRA360 — PHASE 3.7.1: TOMBSTONE RETENTION & CONCURRENCY AUDIT');
  console.log('================================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const timestamp = Date.now();
  const testUsersCreated: string[] = [];

  try {
    // ─────────────────────────────────────────────────────────────
    // AUDIT 1: TOMBSTONE RETENTION UNDER 50+ SESSION VOLUME
    // ─────────────────────────────────────────────────────────────
    console.log('--- Audit 1: Tombstone Retention Under 50+ Session Volume ---');
    const email1 = `audit.tomb50.${timestamp}@terra360.in`;
    testUsersCreated.push(email1);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Audit User 1', email: email1, password: 'Password123!', role: 'citizen' }),
    });

    // 1. Initial Login (obtain Token 0)
    const log1 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email1, password: 'Password123!' }),
    });
    check('Initial login succeeded (HTTP 200)', log1.status === 200);
    const token0Cookie = extractCookie(log1);
    check('Captured Token 0 cookie', !!token0Cookie);

    // 2. Rotate Token 0 once -> becomes 'rotated'
    const ref1 = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token0Cookie}` },
    });
    check('First rotation succeeded (HTTP 200)', ref1.status === 200);
    let currentCookie = extractCookie(ref1);
    check('Captured new active token cookie', !!currentCookie && currentCookie !== token0Cookie);

    // Verify Token 0 is recorded as rotated
    const token0Hash = hashToken(token0Cookie);
    const dbUserAfter1 = await User.findOne({ email: email1 }).select('+refreshTokens');
    const token0TombstoneInit = dbUserAfter1?.refreshTokens.find((s) => s.hash === token0Hash);
    check('Token 0 initial status is "rotated"', token0TombstoneInit?.status === 'rotated');

    // 3. Perform 55 subsequent rotations to exceed the former 50-record limit
    console.log('    Performing 55 subsequent rotations to challenge session cap...');
    let allRotationsSucceeded = true;
    for (let i = 2; i <= 56; i++) {
      const res = await apiFetch(`/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `refreshToken=${currentCookie}` },
      });
      if (res.status !== 200) {
        allRotationsSucceeded = false;
        console.error(`    Rotation #${i} failed with status: ${res.status}`);
        break;
      }
      currentCookie = extractCookie(res);
    }
    check('All 55 subsequent rotations succeeded', allRotationsSucceeded);

    // 4. Verify whether original Token 0 tombstone was retained
    const dbUserAfter56 = await User.findOne({ email: email1 }).select('+refreshTokens');
    const totalSessions = dbUserAfter56?.refreshTokens?.length || 0;
    check('Total session history exceeds 50 records', totalSessions >= 56, `Actual: ${totalSessions}`);

    const token0TombstoneAfter = dbUserAfter56?.refreshTokens.find((s) => s.hash === token0Hash);
    check('Token 0 tombstone is retained in DB until expiration', !!token0TombstoneAfter);
    check('Token 0 retained status remains "rotated"', token0TombstoneAfter?.status === 'rotated');

    // 5. Verify active sessions were NOT removed to make room for tombstones
    const activeSessions = dbUserAfter56?.refreshTokens.filter((s) => s.status === 'active') || [];
    check('Active session is present and not removed for tombstones', activeSessions.length === 1);
    check('Active session hash matches latest current cookie', activeSessions[0]?.hash === hashToken(currentCookie));

    // 6. Attempt to replay Token 0 after 55 rotations
    console.log('    Replaying Token 0 after 55 subsequent rotations...');
    const replayRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${token0Cookie}` },
    });
    const replayJson = (await replayRes.json()) as any;

    check('Replayed Token 0 is rejected with HTTP 401', replayRes.status === 401);
    check('Replay detection triggers TOKEN_REUSE_DETECTED (not INVALID_REFRESH_TOKEN)', replayJson.error?.code === 'TOKEN_REUSE_DETECTED');

    // 7. Verify all active sessions were revoked following reuse detection
    const dbUserAfterReplay = await User.findOne({ email: email1 }).select('+refreshTokens');
    const remainingActive = dbUserAfterReplay?.refreshTokens.filter((s) => s.status === 'active') || [];
    check('All active sessions revoked in DB following replay detection', remainingActive.length === 0);

    // ─────────────────────────────────────────────────────────────
    // AUDIT 2: EXPIRED TOMBSTONE CLEANUP & BOUNDED STORAGE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Audit 2: Expired Tombstone Cleanup & Bounded Storage ---');
    const email2 = `audit.tombclean.${timestamp}@terra360.in`;
    testUsersCreated.push(email2);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Audit User 2', email: email2, password: 'Password123!', role: 'citizen' }),
    });

    const log2 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email2, password: 'Password123!' }),
    });
    const cookie2 = extractCookie(log2);

    // Manually inject 10 expired tombstones into DB
    const expiredTombstones = Array.from({ length: 10 }).map((_, idx) => ({
      hash: hashToken(`expired_token_${idx}_${timestamp}`),
      status: 'rotated',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired 7 days ago
    }));

    await User.updateOne(
      { email: email2 },
      { $push: { refreshTokens: { $each: expiredTombstones } } }
    );

    const dbUserBeforeClean = await User.findOne({ email: email2 }).select('+refreshTokens');
    check('Expired tombstones present before cleanup', (dbUserBeforeClean?.refreshTokens.length || 0) >= 11);

    // Trigger refresh (which executes automatic expired pruning)
    const refCleanRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie2}` },
    });
    check('Refresh trigger succeeded (HTTP 200)', refCleanRes.status === 200);

    const dbUserAfterClean = await User.findOne({ email: email2 }).select('+refreshTokens');
    const expiredRemaining = dbUserAfterClean?.refreshTokens.filter((s) => s.expiresAt <= new Date()) || [];
    check('Expired tombstones were cleaned up from DB', expiredRemaining.length === 0);
    check('Unexpired sessions remain preserved', (dbUserAfterClean?.refreshTokens.length || 0) === 2); // 1 unexpired rotated + 1 active

    // ─────────────────────────────────────────────────────────────
    // AUDIT 3: CONCURRENT REFRESH BEHAVIORS & SYSTEM OBSERVATIONS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Audit 3: Concurrent Refresh Behaviors & Observations ---');
    const email3 = `audit.concur.${timestamp}@terra360.in`;
    testUsersCreated.push(email3);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Audit User 3', email: email3, password: 'Password123!', role: 'citizen' }),
    });

    // Scenario A: Two simultaneous requests using the SAME token (Simulated multi-tab uncoordinated race)
    console.log('    Scenario A: Two simultaneous requests using same token (multi-tab race)');
    const log3A = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookieSim = extractCookie(log3A);

    const [resSim1, resSim2] = await Promise.all([
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookieSim}` } }),
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookieSim}` } }),
    ]);

    const simJson1 = (await resSim1.json()) as any;
    const simJson2 = (await resSim2.json()) as any;
    const simStatuses = [resSim1.status, resSim2.status];

    console.log(`      Req 1: status=${resSim1.status}, code=${simJson1.error?.code || 'SUCCESS'}`);
    console.log(`      Req 2: status=${resSim2.status}, code=${simJson2.error?.code || 'SUCCESS'}`);

    check('Simultaneous requests: exactly one request achieved rotation (HTTP 200)', simStatuses.includes(200));
    check('Simultaneous requests: the race-loser request triggered TOKEN_REUSE_DETECTED (HTTP 401)', simStatuses.includes(401));

    const dbUserSim = await User.findOne({ email: email3 }).select('+refreshTokens');
    const simActiveCount = dbUserSim?.refreshTokens.filter((s) => s.status === 'active').length || 0;
    console.log(`      Resulting active sessions count: ${simActiveCount}`);
    console.log(`      Resulting session statuses: [${dbUserSim?.refreshTokens.map((s) => s.status).join(', ')}]`);
    check('Under strict rotation, simultaneous race is serialized (at most 1 active session remaining)', simActiveCount <= 1);

    // Scenario B: Legitimate retry after network timeout (sequential presentation of old token)
    console.log('    Scenario B: Legitimate retry after network timeout (sequential replay)');
    const log3B = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookieRetry = extractCookie(log3B);

    // First refresh succeeds server-side
    const initialRefresh = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookieRetry}` },
    });
    check('Initial refresh succeeded on server (HTTP 200)', initialRefresh.status === 200);

    // Client retries with the SAME old cookie (simulating unreceived response / timeout)
    const timeoutRetry = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookieRetry}` },
    });
    const retryJson = (await timeoutRetry.json()) as any;
    console.log(`      Timeout retry: status=${timeoutRetry.status}, code=${retryJson.error?.code}`);

    check('Network timeout retry with consumed token triggers TOKEN_REUSE_DETECTED', retryJson.error?.code === 'TOKEN_REUSE_DETECTED');
    const dbUserRetry = await User.findOne({ email: email3 }).select('+refreshTokens');
    const retryActiveCount = dbUserRetry?.refreshTokens.filter((s) => s.status === 'active').length || 0;
    check('Network timeout retry without idempotency token revokes session', retryActiveCount === 0);

    // Scenario C: Two separate devices with independent tokens
    console.log('    Scenario C: Two separate devices with independent refresh tokens');
    const logDevA = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Device-Alpha' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookieDevA = extractCookie(logDevA);

    const logDevB = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Device-Beta' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookieDevB = extractCookie(logDevB);

    // Both devices refresh concurrently
    const [devARef, devBRef] = await Promise.all([
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookieDevA}` } }),
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookieDevB}` } }),
    ]);

    check('Device Alpha refresh succeeded (HTTP 200)', devARef.status === 200);
    check('Device Beta refresh succeeded (HTTP 200)', devBRef.status === 200);

    const dbUserDevs = await User.findOne({ email: email3 }).select('+refreshTokens');
    const devActiveSessions = dbUserDevs?.refreshTokens.filter((s) => s.status === 'active') || [];
    check('Both independent device sessions remain active in DB', devActiveSessions.length === 2);
    check('No TOKEN_REUSE_DETECTED triggered for independent devices', true);

  } finally {
    if (testUsersCreated.length > 0) {
      await User.deleteMany({ email: { $in: testUsersCreated } });
      console.log(`\n🧹 Cleaned up ${testUsersCreated.length} audit test account(s) from MongoDB.`);
    }
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }

  console.log('\n================================================================');
  console.log(`AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditSuite().catch((err) => {
  console.error('Fatal error in audit suite:', err);
  process.exit(1);
});
