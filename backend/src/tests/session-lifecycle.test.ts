/**
 * Terra360 — Phase 3.7: Refresh Token Lifecycle & Revocation Verification Suite
 *
 * Comprehensive automated verification for the session tombstone architecture:
 * 1. Active token rotation (new active created, old becomes rotated with replacedByTokenHash)
 * 2. Rotated-token replay revoking all active sessions (TOKEN_REUSE_DETECTED)
 * 3. Revoked token rejection (SESSION_REVOKED) without affecting other active sessions
 * 4. Device B revoked after Device A changes password (revocationReason: 'password_change')
 * 5. Device A remaining authenticated & able to refresh after Device B attempts refresh
 * 6. Individual session revocation (revocationReason: 'user_revoked')
 * 7. Logout revocation (revocationReason: 'logout')
 * 8. Account deletion revocation (revocationReason: 'account_deletion')
 * 9. Expired token rejection (INVALID_REFRESH_TOKEN) without penalizing other sessions
 * 10. Unknown token rejection (INVALID_REFRESH_TOKEN) without penalizing other sessions
 * 11. Concurrent refresh requests (only one rotation succeeds, atomic guard prevents duplicate tokens)
 * 12. Migration compatibility for legacy session records (missing status defaults to active and rotates)
 */

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { hashToken, generateRandomToken } from '../utils/crypto';
import { signRefreshToken, signAccessToken } from '../utils/jwt';

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

async function runSessionLifecycleSuite() {
  console.log('================================================================');
  console.log('🔄 TERRA360 — PHASE 3.7: SESSION LIFECYCLE & TOMBSTONE AUDIT');
  console.log('================================================================\n');

  await mongoose.connect(env.MONGODB_URI);

  const timestamp = Date.now();
  const testUsersCreated: string[] = [];

  // Pre-clean any leftover test users
  await User.deleteMany({ email: { $regex: '^sess\\.' } });

  try {
    // ─────────────────────────────────────────────────────────────
    // SCENARIO 1: ACTIVE TOKEN ROTATION
    // ─────────────────────────────────────────────────────────────
    console.log('--- Scenario 1: Active Token Rotation ---');
    const email1 = `sess.scen1.${timestamp}@terra360.in`;
    testUsersCreated.push(email1);

    const reg1 = await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen1 User', email: email1, password: 'Password123!', role: 'citizen' }),
    });
    check('User registered', reg1.status === 201);

    const log1 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Device1-Agent' },
      body: JSON.stringify({ email: email1, password: 'Password123!' }),
    });
    check('User logged in', log1.status === 200);
    const cookie1 = extractCookie(log1);
    check('Initial refresh token cookie received', !!cookie1);

    // Initial DB inspection
    const dbUser1 = await User.findOne({ email: email1 }).select('+refreshTokens');
    check('Initial session is active', dbUser1?.refreshTokens?.[0]?.status === 'active');
    const initialHash = hashToken(cookie1);
    check('Initial session hash matches cookie', dbUser1?.refreshTokens?.[0]?.hash === initialHash);

    // Perform Refresh
    const ref1 = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie1}`, 'User-Agent': 'Device1-Agent' },
    });
    check('Refresh request succeeded (HTTP 200)', ref1.status === 200);
    const cookie1Rotated = extractCookie(ref1);
    check('New rotated refresh token cookie received', !!cookie1Rotated && cookie1Rotated !== cookie1);

    // Verify DB Tombstone and New Active Session
    const dbUser1After = await User.findOne({ email: email1 }).select('+refreshTokens');
    check('DB refreshTokens length is 2 (1 tombstone + 1 active)', dbUser1After?.refreshTokens?.length === 2);

    const oldSession = dbUser1After?.refreshTokens.find((s) => s.hash === initialHash);
    const newSession = dbUser1After?.refreshTokens.find((s) => s.hash === hashToken(cookie1Rotated));

    check('Old session transitioned to status "rotated"', oldSession?.status === 'rotated');
    check('Old session has replacedByTokenHash set to new hash', oldSession?.replacedByTokenHash === hashToken(cookie1Rotated));
    check('New session has status "active"', newSession?.status === 'active');

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 2: ROTATED TOKEN REPLAY (TOKEN REUSE DETECTION)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 2: Rotated-Token Replay (Token-Reuse Detection) ---');
    // Replay the old, already rotated cookie1
    const replayRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie1}` },
    });
    const replayJson = (await replayRes.json()) as any;
    check('Replayed rotated token rejected with HTTP 401', replayRes.status === 401);
    check('Error code is TOKEN_REUSE_DETECTED', replayJson.error?.code === 'TOKEN_REUSE_DETECTED');

    // Verify all active sessions were revoked
    const dbUser1AfterReplay = await User.findOne({ email: email1 }).select('+refreshTokens');
    const anyActiveLeft = dbUser1AfterReplay?.refreshTokens.some((s) => s.status === 'active');
    check('All active sessions revoked in DB', anyActiveLeft === false);
    const newSessionAfter = dbUser1AfterReplay?.refreshTokens.find((s) => s.hash === hashToken(cookie1Rotated));
    check('Active session was changed to status "revoked"', newSessionAfter?.status === 'revoked');
    check('Revocation reason is "token_reuse"', newSessionAfter?.revocationReason === 'token_reuse');
    check('revokedAt timestamp is set', !!newSessionAfter?.revokedAt);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 3: REVOKED TOKEN REJECTION (NO UNRELATED REVOCATION)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 3: Revoked Token Rejection without Affecting Unrelated Sessions ---');
    const email3 = `sess.scen3.${timestamp}@terra360.in`;
    testUsersCreated.push(email3);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen3 User', email: email3, password: 'Password123!', role: 'citizen' }),
    });

    // Login Session A
    const log3A = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Agent-A' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookie3A = extractCookie(log3A);

    // Login Session B
    const log3B = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Agent-B' },
      body: JSON.stringify({ email: email3, password: 'Password123!' }),
    });
    const cookie3B = extractCookie(log3B);

    // Manually mark Session B as 'revoked' in DB to test direct presentation of revoked token
    const hash3B = hashToken(cookie3B);
    await User.updateOne(
      { email: email3, 'refreshTokens.hash': hash3B },
      { $set: { 'refreshTokens.$.status': 'revoked', 'refreshTokens.$.revocationReason': 'user_revoked', 'refreshTokens.$.revokedAt': new Date() } }
    );

    // Present Revoked Token (Session B) to /refresh
    const revokedRefRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie3B}` },
    });
    const revokedRefJson = (await revokedRefRes.json()) as any;
    check('Revoked token refresh rejected with HTTP 401', revokedRefRes.status === 401);
    check('Error code is SESSION_REVOKED (not TOKEN_REUSE_DETECTED)', revokedRefJson.error?.code === 'SESSION_REVOKED');
    check('Message indicates session has been revoked', revokedRefJson.error?.message?.toLowerCase().includes('revoked'));

    // Check that Session A is STILL ACTIVE in DB!
    const dbUser3After = await User.findOne({ email: email3 }).select('+refreshTokens');
    const session3A = dbUser3After?.refreshTokens.find((s) => s.hash === hashToken(cookie3A));
    check('Session A remains ACTIVE in DB', session3A?.status === 'active');

    // And Session A can refresh successfully!
    const session3ARef = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie3A}` },
    });
    check('Session A refreshes successfully with HTTP 200', session3ARef.status === 200);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 4 & 5: MULTI-DEVICE PASSWORD CHANGE & CONTINUOUS SESSION VALIDITY
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 4 & 5: Multi-Device Password Change & Device A Resiliency ---');
    const email4 = `sess.scen4.${timestamp}@terra360.in`;
    testUsersCreated.push(email4);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Multi-Device User', email: email4, password: 'Password123!', role: 'citizen' }),
    });

    // Device A logs in
    const devALogin = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Device-A' },
      body: JSON.stringify({ email: email4, password: 'Password123!' }),
    });
    const devAToken = ((await devALogin.json()) as any).data?.accessToken;
    const devACookie = extractCookie(devALogin);

    // Device B logs in
    const devBLogin = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Device-B' },
      body: JSON.stringify({ email: email4, password: 'Password123!' }),
    });
    const devBCookie = extractCookie(devBLogin);

    // Device A changes password
    const pwChangeRes = await apiFetch(`/api/v1/users/me/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devAToken}`,
        Cookie: `refreshToken=${devACookie}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword999!',
        confirmPassword: 'NewPassword999!',
      }),
    });
    check('Device A password change succeeded (HTTP 200)', pwChangeRes.status === 200);

    // Inspect DB for Scenario 4
    const dbUser4AfterPw = await User.findOne({ email: email4 }).select('+refreshTokens');
    const devASession = dbUser4AfterPw?.refreshTokens.find((s) => s.hash === hashToken(devACookie));
    const devBSession = dbUser4AfterPw?.refreshTokens.find((s) => s.hash === hashToken(devBCookie));

    check('Device A session remains "active"', devASession?.status === 'active');
    check('Device B session marked "revoked"', devBSession?.status === 'revoked');
    check('Device B revocationReason is "password_change"', devBSession?.revocationReason === 'password_change');
    check('Device B revokedAt is set', !!devBSession?.revokedAt);

    // Scenario 5: Device B attempts refresh with its revoked cookie
    const devBRefresh = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${devBCookie}` },
    });
    const devBRefreshJson = (await devBRefresh.json()) as any;
    check('Device B refresh rejected with HTTP 401', devBRefresh.status === 401);
    check('Device B rejected specifically with code SESSION_REVOKED', devBRefreshJson.error?.code === 'SESSION_REVOKED');

    // Scenario 5 Crucial Check: Device A can STILL refresh!
    const devARefresh = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${devACookie}` },
    });
    check('Device A subsequent refresh succeeds with HTTP 200 (BUG RESOLVED)', devARefresh.status === 200);
    const devANewCookie = extractCookie(devARefresh);
    check('Device A received rotated refresh cookie', !!devANewCookie && devANewCookie !== devACookie);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 6: INDIVIDUAL SESSION REVOCATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 6: Individual Session Revocation (revocationReason: "user_revoked") ---');
    const email6 = `sess.scen6.${timestamp}@terra360.in`;
    testUsersCreated.push(email6);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen6 User', email: email6, password: 'Password123!', role: 'citizen' }),
    });

    const log6_1 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Client-1' },
      body: JSON.stringify({ email: email6, password: 'Password123!' }),
    });
    const token6_1 = ((await log6_1.json()) as any).data?.accessToken;
    const cookie6_1 = extractCookie(log6_1);

    const log6_2 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Client-2' },
      body: JSON.stringify({ email: email6, password: 'Password123!' }),
    });
    const cookie6_2 = extractCookie(log6_2);

    // List sessions via GET /api/v1/users/me/sessions
    const list6Res = await apiFetch(`/api/v1/users/me/sessions`, {
      headers: { Authorization: `Bearer ${token6_1}`, Cookie: `refreshToken=${cookie6_1}` },
    });
    const sessions6 = ((await list6Res.json()) as any).data?.sessions;
    check('2 active sessions returned in list', Array.isArray(sessions6) && sessions6.length === 2);

    const sessionToRevoke = sessions6.find((s: any) => !s.isCurrent);
    check('Identified non-current session to revoke', !!sessionToRevoke?.id);

    // Revoke Session 2
    const revokeRes = await apiFetch(`/api/v1/users/me/sessions/${sessionToRevoke.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token6_1}` },
    });
    check('Session revoked via API (HTTP 200)', revokeRes.status === 200);

    // Verify DB Tombstone
    const dbUser6 = await User.findOne({ email: email6 }).select('+refreshTokens');
    const revokedSessionDoc = dbUser6?.refreshTokens.find((s) => s._id?.toString() === sessionToRevoke.id);
    check('Session status is "revoked" in DB', revokedSessionDoc?.status === 'revoked');
    check('Revocation reason is "user_revoked"', revokedSessionDoc?.revocationReason === 'user_revoked');
    check('revokedAt timestamp recorded', !!revokedSessionDoc?.revokedAt);

    // Verify GET /sessions no longer includes revoked session
    const list6After = await apiFetch(`/api/v1/users/me/sessions`, {
      headers: { Authorization: `Bearer ${token6_1}`, Cookie: `refreshToken=${cookie6_1}` },
    });
    const sessions6After = ((await list6After.json()) as any).data?.sessions;
    check('Sessions list now only contains 1 active session', sessions6After?.length === 1);
    check('Revoked session is excluded from list', !sessions6After?.some((s: any) => s.id === sessionToRevoke.id));

    // Verify refreshing with Session 2 cookie is rejected with SESSION_REVOKED
    const refRevokedRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie6_2}` },
    });
    const refRevokedJson = (await refRevokedRes.json()) as any;
    check('Revoked session refresh rejected with HTTP 401', refRevokedRes.status === 401);
    check('Error code is SESSION_REVOKED', refRevokedJson.error?.code === 'SESSION_REVOKED');

    // Verify Session 1 still works
    const refActiveRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie6_1}` },
    });
    check('Session 1 refreshes successfully (HTTP 200)', refActiveRes.status === 200);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 7: LOGOUT REVOCATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 7: Logout Revocation (revocationReason: "logout") ---');
    const email7 = `sess.scen7.${timestamp}@terra360.in`;
    testUsersCreated.push(email7);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen7 User', email: email7, password: 'Password123!', role: 'citizen' }),
    });

    const log7A = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Client-7A' },
      body: JSON.stringify({ email: email7, password: 'Password123!' }),
    });
    const cookie7A = extractCookie(log7A);

    const log7B = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Client-7B' },
      body: JSON.stringify({ email: email7, password: 'Password123!' }),
    });
    const cookie7B = extractCookie(log7B);

    // Logout from Client 7A
    const logoutRes = await apiFetch(`/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie7A}` },
    });
    check('Logout succeeded (HTTP 200)', logoutRes.status === 200);

    // Check DB state for Client 7A session
    const dbUser7 = await User.findOne({ email: email7 }).select('+refreshTokens');
    const loggedOutSession = dbUser7?.refreshTokens.find((s) => s.hash === hashToken(cookie7A));
    const otherSession = dbUser7?.refreshTokens.find((s) => s.hash === hashToken(cookie7B));

    check('Logged out session has status "revoked"', loggedOutSession?.status === 'revoked');
    check('Logged out session revocationReason is "logout"', loggedOutSession?.revocationReason === 'logout');
    check('Other session (Client 7B) remains "active"', otherSession?.status === 'active');

    // Attempting refresh with logged out cookie
    const refLogoutRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie7A}` },
    });
    const refLogoutJson = (await refLogoutRes.json()) as any;
    check('Logged out session refresh rejected with HTTP 401', refLogoutRes.status === 401);
    check('Rejection code is SESSION_REVOKED', refLogoutJson.error?.code === 'SESSION_REVOKED');

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 8: ACCOUNT DELETION REVOCATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 8: Account Deletion Revocation (revocationReason: "account_deletion") ---');
    const email8 = `sess.scen8.${timestamp}@terra360.in`;
    testUsersCreated.push(email8);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen8 User', email: email8, password: 'Password123!', role: 'citizen' }),
    });

    const log8 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email8, password: 'Password123!' }),
    });
    const token8 = ((await log8.json()) as any).data?.accessToken;
    const cookie8 = extractCookie(log8);

    // Delete account
    const delRes = await apiFetch(`/api/v1/users/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token8}` },
      body: JSON.stringify({ confirmationText: 'DELETE' }),
    });
    check('Account deleted (HTTP 200)', delRes.status === 200);

    // Check DB
    const dbUser8 = await User.findOne({ email: email8 }).select('+refreshTokens +isDeleted +isActive');
    check('User isDeleted = true', dbUser8?.isDeleted === true);
    check('User isActive = false', dbUser8?.isActive === false);
    check(
      'All sessions have status "revoked" with reason "account_deletion"',
      dbUser8?.refreshTokens.every((s) => s.status === 'revoked' && s.revocationReason === 'account_deletion') === true
    );

    // Refresh attempt on deleted account
    const refDelRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie8}` },
    });
    check('Refresh on deleted account rejected with HTTP 401 (UNAUTHORIZED)', refDelRes.status === 401);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 9: EXPIRED TOKEN BEHAVIOR
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 9: Expired Token Rejection (Without Session Penalties) ---');
    const email9 = `sess.scen9.${timestamp}@terra360.in`;
    testUsersCreated.push(email9);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen9 User', email: email9, password: 'Password123!', role: 'citizen' }),
    });

    const log9 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email9, password: 'Password123!' }),
    });
    const cookie9 = extractCookie(log9);

    // Manually expire the session in DB
    await User.updateOne(
      { email: email9, 'refreshTokens.hash': hashToken(cookie9) },
      { $set: { 'refreshTokens.$.expiresAt': new Date(Date.now() - 10000) } }
    );

    const refExpiredRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${cookie9}` },
    });
    const refExpiredJson = (await refExpiredRes.json()) as any;
    check('Expired token rejected with HTTP 401', refExpiredRes.status === 401);
    check('Error code is INVALID_REFRESH_TOKEN', refExpiredJson.error?.code === 'INVALID_REFRESH_TOKEN');

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 10: UNKNOWN TOKEN BEHAVIOR
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 10: Unknown Token (Valid JWT, Unknown Hash in DB) ---');
    const email10 = `sess.scen10.${timestamp}@terra360.in`;
    testUsersCreated.push(email10);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen10 User', email: email10, password: 'Password123!', role: 'citizen' }),
    });

    const log10 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email10, password: 'Password123!' }),
    });
    const cookie10 = extractCookie(log10);

    const user10Doc = await User.findOne({ email: email10 });
    // Craft a valid signed refresh JWT for user10 with random JTI never stored in DB
    const unknownJwt = signRefreshToken({ sub: user10Doc!._id.toString(), jti: generateRandomToken(16) });

    const refUnknownRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${unknownJwt}` },
    });
    const refUnknownJson = (await refUnknownRes.json()) as any;
    check('Unknown token rejected with HTTP 401', refUnknownRes.status === 401);
    check('Error code is INVALID_REFRESH_TOKEN (not TOKEN_REUSE_DETECTED)', refUnknownJson.error?.code === 'INVALID_REFRESH_TOKEN');

    // Verify legitimate session for user 10 was NOT penalized
    const user10DbAfter = await User.findOne({ email: email10 }).select('+refreshTokens');
    const legSession = user10DbAfter?.refreshTokens.find((s) => s.hash === hashToken(cookie10));
    check('Legitimate active session remains active', legSession?.status === 'active');

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 11: CONCURRENT REFRESH REQUESTS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 11: Concurrent Refresh Requests ---');
    const email11 = `sess.scen11.${timestamp}@terra360.in`;
    testUsersCreated.push(email11);

    await apiFetch(`/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Scen11 User', email: email11, password: 'Password123!', role: 'citizen' }),
    });

    const log11 = await apiFetch(`/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email11, password: 'Password123!' }),
    });
    const cookie11 = extractCookie(log11);

    // Fire two concurrent refresh requests simultaneously with the same cookie11
    const [concRes1, concRes2] = await Promise.all([
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookie11}` } }),
      apiFetch(`/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${cookie11}` } }),
    ]);

    const statuses = [concRes1.status, concRes2.status];
    check('Exactly one concurrent request succeeded with HTTP 200', statuses.filter((s) => s === 200).length === 1);
    check('The other concurrent request was rejected with HTTP 401', statuses.filter((s) => s === 401).length === 1);

    // Verify DB does not contain duplicated active sessions
    const dbUser11 = await User.findOne({ email: email11 }).select('+refreshTokens');
    const activeTokens = (dbUser11?.refreshTokens || []).filter((s) => s.status === 'active');
    check('DB contains at most 1 active token after concurrent race', activeTokens.length <= 1);

    // ─────────────────────────────────────────────────────────────
    // SCENARIO 12: MIGRATION & BACKWARD COMPATIBILITY FOR LEGACY SESSIONS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 12: Migration & Compatibility for Legacy Sessions (Missing Status) ---');
    const email12 = `sess.scen12.${timestamp}@terra360.in`;
    testUsersCreated.push(email12);

    const legacyUser = new User({
      name: 'Legacy User',
      email: email12,
      passwordHash: 'dummyhash123',
      role: 'citizen',
      emailVerified: true,
      isActive: true,
    });
    await legacyUser.save();

    // Re-sign with actual user ID
    const userLegacyJwt = signRefreshToken({ sub: legacyUser._id.toString(), jti: generateRandomToken(16) });
    const legacyHash = hashToken(userLegacyJwt);

    // Insert raw MongoDB document sub-element without 'status' field to simulate pre-migration data
    await User.collection.updateOne(
      { _id: legacyUser._id },
      {
        $push: {
          refreshTokens: {
            _id: new mongoose.Types.ObjectId(),
            hash: legacyHash,
            // Notice: status is completely omitted (legacy record)
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent: 'Legacy Client v1.0',
            ip: '198.51.100.99',
          } as any,
        },
      }
    );

    // Check that getSessions treats legacy session without status as active
    const legacyAccessToken = signAccessToken({ sub: legacyUser._id.toString(), email: email12, role: 'citizen' });

    const legacyListRes = await apiFetch(`/api/v1/users/me/sessions`, {
      headers: { Authorization: `Bearer ${legacyAccessToken}`, Cookie: `refreshToken=${userLegacyJwt}` },
    });
    const legacyList = ((await legacyListRes.json()) as any).data?.sessions;
    check('Legacy session with missing status returned as active session', legacyList?.length === 1);
    check('Legacy session isCurrent marked true', legacyList?.[0]?.isCurrent === true);

    // Refreshing with legacy session succeeds and rotates cleanly
    const legacyRefRes = await apiFetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${userLegacyJwt}` },
    });
    check('Legacy session refreshes successfully with HTTP 200', legacyRefRes.status === 200);
    const legacyRotatedCookie = extractCookie(legacyRefRes);
    check('New rotated cookie issued for legacy session', !!legacyRotatedCookie && legacyRotatedCookie !== userLegacyJwt);

    // Verify DB updated legacy session to rotated and new session to active
    const dbUser12 = await User.findById(legacyUser._id).select('+refreshTokens');
    const oldLegacyDoc = dbUser12?.refreshTokens.find((s) => s.hash === legacyHash);
    const newLegacyDoc = dbUser12?.refreshTokens.find((s) => s.hash === hashToken(legacyRotatedCookie));

    check('Legacy session now has status "rotated"', oldLegacyDoc?.status === 'rotated');
    check('Legacy session replacedByTokenHash is populated', oldLegacyDoc?.replacedByTokenHash === hashToken(legacyRotatedCookie));
    check('Newly issued session has status "active"', newLegacyDoc?.status === 'active');
  } finally {
    // Clean up created test accounts
    if (testUsersCreated.length > 0) {
      await User.deleteMany({ email: { $in: testUsersCreated } });
      console.log(`\n🧹 Cleaned up ${testUsersCreated.length} test user account(s) from MongoDB.`);
    }
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }

  console.log('\n================================================================');
  console.log(`SESSION LIFECYCLE AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSessionLifecycleSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
