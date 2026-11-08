export {};

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { Report } from '../modules/reports/report.model';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

function extractCookie(headers: Headers, cookieName: string): string | null {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runSecurityAuditTests() {
  console.log('\n========================================================');
  console.log('🛡️ TERRA360 — PHASE 3.6 ACCOUNT SECURITY AUDIT SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function check(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}`);
      if (details) console.error(`    Details: ${details}`);
      failed++;
    }
  }

  // Connect to DB for direct state verification & cleanup
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, { dbName: 'Terra360' });
  }

  const timestamp = Date.now();
  const user1Email = `sec.user1.${timestamp}@terra360.in`;
  const user2Email = `sec.user2.${timestamp}@terra360.in`;
  const passInitial = 'StrongPassword123!';
  const passNew = 'NewlyUpdatedPassword456!';

  try {
    // ── AUDIT 1: ACCOUNT DELETION & ACCESS TOKEN INVALIDATION ──
    console.log('--- Audit 1: Account Deletion & Access-Token Invalidation ---');

    // Register & Login User 1
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.70',
      },
      body: JSON.stringify({
        name: 'Audit Subject One',
        email: user1Email,
        password: passInitial,
        role: 'citizen',
      }),
    });

    const login1Res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.71',
      },
      body: JSON.stringify({
        email: user1Email,
        password: passInitial,
      }),
    });
    const login1Json = (await login1Res.json()) as any;
    const tokenBeforeDeletion = login1Json.data?.accessToken;
    const cookieBeforeDeletion = extractCookie(login1Res.headers, 'refreshToken') || '';

    // Verify token works before deletion
    const preCheckRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${tokenBeforeDeletion}` },
    });
    check('Access token valid prior to deletion (HTTP 200)', preCheckRes.status === 200);

    // Delete account
    const deleteRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenBeforeDeletion}`,
      },
      body: JSON.stringify({ confirmationText: 'DELETE' }),
    });
    check('DELETE /users/me succeeds with HTTP 200', deleteRes.status === 200);

    const deleteCookie = deleteRes.headers.get('set-cookie') || '';
    check('Deletion clears refresh cookie', deleteCookie.toLowerCase().includes('refreshtoken=;') || deleteCookie.includes('Max-Age=0') || deleteCookie.includes('expires=Thu, 01 Jan 1970'));

    // Test: Access token issued before deletion MUST be rejected
    const postDeleteReq = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${tokenBeforeDeletion}` },
    });
    const postDeleteJson = (await postDeleteReq.json()) as any;
    check('Previously issued access token rejected after deletion (HTTP 401)', postDeleteReq.status === 401);
    check('Error code is UNAUTHORIZED', postDeleteJson.error?.code === 'UNAUTHORIZED');
    check(
      'Message indicates account deactivated',
      postDeleteJson.error?.message?.toLowerCase().includes('deactivated') ||
      postDeleteJson.error?.message?.toLowerCase().includes('not found')
    );

    // Test: Refresh with deleted cookie is rejected
    const postDeleteRefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${cookieBeforeDeletion}`,
        'X-Forwarded-For': '198.51.100.72',
      },
    });
    check('Refresh with deleted session rejected with HTTP 401', postDeleteRefresh.status === 401);

    // ── AUDIT 2: INACTIVE ACCOUNT ACCESS REJECTION ──
    console.log('\n--- Audit 2: Inactive Account Access Enforcement ---');
    {
      const inactiveEmail = `sec.inactive.${timestamp}@terra360.in`;
      await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.73',
        },
        body: JSON.stringify({
          name: 'Inactive User',
          email: inactiveEmail,
          password: passInitial,
          role: 'citizen',
        }),
      });

      const inactiveLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.74',
        },
        body: JSON.stringify({ email: inactiveEmail, password: passInitial }),
      });
      const inactiveToken = ((await inactiveLoginRes.json()) as any).data?.accessToken;

      // Simulate administrative deactivation in DB
      await User.updateOne({ email: inactiveEmail }, { isActive: false });

      // Request with valid token must be denied
      const checkRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${inactiveToken}` },
      });
      check('Token rejected when isActive is false (HTTP 401)', checkRes.status === 401);

      await User.deleteOne({ email: inactiveEmail });
    }

    // ── AUDIT 3: PERSONAL DATA EXPORT PRIVACY & CACHE HEADERS ──
    console.log('\n--- Audit 3: Personal Data Export Privacy & Headers ---');

    // Register & Login User 2
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.75',
      },
      body: JSON.stringify({
        name: 'Kezie Angami',
        email: user2Email,
        password: passInitial,
        role: 'citizen',
        language: 'en',
      }),
    });

    const login2Res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.76',
      },
      body: JSON.stringify({ email: user2Email, password: passInitial }),
    });
    const login2Json = (await login2Res.json()) as any;
    const user2Token = login2Json.data?.accessToken;
    const user2Cookie = extractCookie(login2Res.headers, 'refreshToken') || '';
    const user2Id = login2Json.data?.user?._id;

    // Create an anonymous report (no reporterPhone, no reporterId)
    const anonReport = await Report.create({
      reportId: `TR-ANON-${timestamp}`,
      state: 'Assam',
      location: 'NH-27 KM 12',
      hazardType: 'Minor Slip',
      severity: 'Watch',
      description: 'Anonymous report not belonging to user',
      status: 'submitted',
      source: 'public',
      isDeleted: false,
    });

    // Create a report by user2
    const user2Report = await Report.create({
      reportId: `TR-USER2-${timestamp}`,
      state: 'Nagaland',
      location: 'Kohima Bypass',
      hazardType: 'Rockfall',
      severity: 'Critical',
      description: 'Report created by user 2',
      reporterId: new mongoose.Types.ObjectId(user2Id),
      reporterName: 'Kezie Angami',
      status: 'submitted',
      source: 'citizen',
      isDeleted: false,
      ipAddress: '10.0.0.99', // sensitive internal IP
      userAgent: 'Secret-Client/1.0',
      verificationNotes: 'Internal triage note - classified',
    });

    // Request Export
    const exportRes = await fetch(`${BASE_URL}/api/v1/users/me/export`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    check('Export endpoint returns HTTP 200', exportRes.status === 200);

    // Verify Privacy & Cache Headers
    const cacheControl = exportRes.headers.get('cache-control') || '';
    check('Cache-Control header contains no-store', cacheControl.includes('no-store'));
    check('Cache-Control header contains no-cache', cacheControl.includes('no-cache'));

    const pragma = exportRes.headers.get('pragma') || '';
    check('Pragma header contains no-cache', pragma.includes('no-cache'));

    const contentDisp = exportRes.headers.get('content-disposition') || '';
    check('Content-Disposition header is attachment', contentDisp.includes('attachment'));

    const contentType = exportRes.headers.get('content-type') || '';
    check('Content-Type is application/json', contentType.includes('application/json'));

    const exportJson = (await exportRes.json()) as any;

    // Verify sensitive fields strictly absent
    check('Export strictly excludes passwordHash', exportJson.account?.passwordHash === undefined);
    check('Export strictly excludes refreshTokens', exportJson.account?.refreshTokens === undefined);
    check('Export strictly excludes emailVerificationToken', exportJson.account?.emailVerificationToken === undefined);
    check('Export strictly excludes passwordResetToken', exportJson.account?.passwordResetToken === undefined);
    check('Export strictly excludes failedLogins', exportJson.account?.failedLogins === undefined);
    check('Export strictly excludes lockedUntil', exportJson.account?.lockedUntil === undefined);

    // Verify reports privacy: only user's own reports, and sensitive internal fields excluded
    check('Export includes user2 report', exportJson.reports?.some((r: any) => r.reportId === user2Report.reportId));
    check('Export strictly does NOT leak anonymous report (unrelated user)', !exportJson.reports?.some((r: any) => r.reportId === anonReport.reportId));

    const exportedReport = exportJson.reports?.find((r: any) => r.reportId === user2Report.reportId);
    check('Report ipAddress is scrubbed from export', exportedReport?.ipAddress === undefined);
    check('Report userAgent is scrubbed from export', exportedReport?.userAgent === undefined);
    check('Report verificationNotes is scrubbed from export', exportedReport?.verificationNotes === undefined);

    // ── AUDIT 4: PASSWORD CHANGE & SESSION CONSISTENCY ──
    console.log('\n--- Audit 4: Password Change & Multi-Session Revocation ---');

    // Create Device B session for User 2
    const deviceBRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Device-B-Safari/17.0',
        'X-Forwarded-For': '198.51.100.80',
      },
      body: JSON.stringify({ email: user2Email, password: passInitial }),
    });
    const deviceBCookie = extractCookie(deviceBRes.headers, 'refreshToken') || '';
    check('Device B logged in successfully', deviceBRes.status === 200);

    // User 2 changes password from Device A (passing Device A's refreshToken cookie)
    const pwChangeRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
        Cookie: `refreshToken=${user2Cookie}`,
      },
      body: JSON.stringify({
        currentPassword: passInitial,
        newPassword: passNew,
        confirmPassword: passNew,
      }),
    });
    check('Password change from Device A succeeds (HTTP 200)', pwChangeRes.status === 200);

    // Test: Device A (current session) can continue making authenticated requests
    const deviceAReq = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    check('Device A access token remains valid for current session (HTTP 200)', deviceAReq.status === 200);

    // Test: Device A can rotate its refresh token normally
    const deviceARefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${user2Cookie}`,
        'X-Forwarded-For': '198.51.100.81',
      },
    });
    check('Device A current refresh session is preserved (HTTP 200)', deviceARefresh.status === 200);

    // Test: Device B (revoked session) CANNOT refresh
    const deviceBRefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${deviceBCookie}`,
        'X-Forwarded-For': '198.51.100.82',
      },
    });
    check('Device B session revoked and cannot refresh (HTTP 401)', deviceBRefresh.status === 401);

    // ── AUDIT 5: CROSS-USER SESSION REVOCATION ATTEMPTS ──
    console.log('\n--- Audit 5: Cross-User Session Revocation Isolation ---');

    // User 2 logs in fresh with new password to obtain an active session
    const user2FreshLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.85',
      },
      body: JSON.stringify({ email: user2Email, password: passNew }),
    });
    const freshLoginJson = (await user2FreshLogin.json()) as any;
    const user2ActiveToken = freshLoginJson.data?.accessToken;

    // Create User 3 (Attacker)
    const user3Email = `sec.user3.${timestamp}@terra360.in`;
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.83',
      },
      body: JSON.stringify({
        name: 'User Three',
        email: user3Email,
        password: passInitial,
        role: 'driver',
      }),
    });

    const login3Res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.84',
      },
      body: JSON.stringify({ email: user3Email, password: passInitial }),
    });
    const user3Token = ((await login3Res.json()) as any).data?.accessToken;

    // Get User 2's session ID
    const user2SessionsRes = await fetch(`${BASE_URL}/api/v1/users/me/sessions`, {
      headers: { Authorization: `Bearer ${user2ActiveToken}` },
    });
    const user2SessionId = ((await user2SessionsRes.json()) as any).data?.sessions?.[0]?.id;
    check('Obtained User 2 valid session ID', !!user2SessionId);

    // Attempt: User 3 tries to revoke User 2's session
    const crossRevokeRes = await fetch(
      `${BASE_URL}/api/v1/users/me/sessions/${user2SessionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user3Token}` },
      }
    );
    check('Cross-user session revocation denied with HTTP 404 (ResourceNotFoundError)', crossRevokeRes.status === 404);

    // Verify User 2's session is still intact in DB
    const user2Db = await User.findOne({ email: user2Email }).select('+refreshTokens');
    const sessionStillActive = user2Db?.refreshTokens?.some((s: any) => s._id.toString() === user2SessionId);
    check('Target user session remains intact after cross-user attack attempt', sessionStillActive === true);

    // ── AUDIT 6: SESSION METADATA SANITIZATION ──
    console.log('\n--- Audit 6: Session Listing Metadata Sanitization ---');
    const sessionsListRes = await fetch(`${BASE_URL}/api/v1/users/me/sessions`, {
      headers: { Authorization: `Bearer ${user2ActiveToken}` },
    });
    const sessionsList = ((await sessionsListRes.json()) as any).data?.sessions;
    check('Sessions list contains entries', Array.isArray(sessionsList) && sessionsList.length > 0);
    check('Session objects strictly exclude hash', sessionsList.every((s: any) => s.hash === undefined));
    check('Session objects contain userAgent and ip', sessionsList.every((s: any) => typeof s.userAgent === 'string' && typeof s.ip === 'string'));
    check('Session objects contain createdAt and expiresAt', sessionsList.every((s: any) => typeof s.createdAt === 'string' && typeof s.expiresAt === 'string'));

    // Cleanup reports
    await Report.deleteMany({ _id: { $in: [anonReport._id, user2Report._id] } });
    await User.deleteMany({ email: { $in: [user1Email, user2Email, user3Email] } });
    console.log('\n🧹 Cleaned up all audit test entities from MongoDB.');
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Fatal audit test error:', err);
  process.exit(1);
});
