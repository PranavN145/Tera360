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

async function runEdgeCaseTests() {
  console.log('\n================================================================');
  console.log('🔬 TERRA360 — PHASE 3.6.1 SESSION & EXPORT EDGE-CASE AUDIT');
  console.log('================================================================\n');

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

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, { dbName: 'Terra360' });
  }

  const timestamp = Date.now();
  const sharedPhone = '+91 98765 99999';

  const userAEmail = `edge.userA.${timestamp}@terra360.in`;
  const userBEmail = `edge.userB.${timestamp}@terra360.in`;
  const passwordInitial = 'Password123!';
  const passwordUpdated = 'UpdatedPass987!';

  let anonReportId = '';
  let userBReportId = '';
  let userAReportId = '';

  try {
    // ── SCENARIO 1: PERSONAL-DATA EXPORT OWNERSHIP & ISOLATION ──
    console.log('--- Scenario 1: Export Ownership with Shared Phone Numbers ---');

    // 1. Register Account A with sharedPhone
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.101',
      },
      body: JSON.stringify({
        name: 'Account A (Brother)',
        email: userAEmail,
        password: passwordInitial,
        role: 'citizen',
        phone: sharedPhone,
      }),
    });

    const loginARes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.102',
      },
      body: JSON.stringify({ email: userAEmail, password: passwordInitial }),
    });
    const tokenA = ((await loginARes.json()) as any).data?.accessToken;
    const userAId = ((await User.findOne({ email: userAEmail })) as any)._id;

    // 2. Register Account B with the SAME sharedPhone
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.103',
      },
      body: JSON.stringify({
        name: 'Account B (Sister)',
        email: userBEmail,
        password: passwordInitial,
        role: 'citizen',
        phone: sharedPhone,
      }),
    });

    const userBId = ((await User.findOne({ email: userBEmail })) as any)._id;

    // 3. Account B submits an authenticated hazard report with sharedPhone
    const repB = await Report.create({
      reportId: `TR-B-${timestamp}`,
      state: 'Mizoram',
      location: 'Aizawl North Pass',
      hazardType: 'Subsidence',
      severity: 'Critical',
      description: 'Private report submitted by Account B',
      reporterId: userBId,
      reporterName: 'Account B (Sister)',
      reporterPhone: sharedPhone,
      status: 'submitted',
      source: 'citizen',
      isDeleted: false,
      ipAddress: '192.168.1.50',
      verificationNotes: 'Internal note for Sister report',
    });
    userBReportId = repB.reportId;

    // 4. Anonymous public user submits report with sharedPhone (no reporterId)
    const repAnon = await Report.create({
      reportId: `TR-ANON-${timestamp}`,
      state: 'Assam',
      location: 'Guwahati Outskirts',
      hazardType: 'Mudflow',
      severity: 'Warning',
      description: 'Public unauthenticated report with same phone number',
      reporterName: 'Stranger',
      reporterPhone: sharedPhone,
      status: 'submitted',
      source: 'public',
      isDeleted: false,
    });
    anonReportId = repAnon.reportId;

    // 5. Account A submits their own authenticated report
    const repA = await Report.create({
      reportId: `TR-A-${timestamp}`,
      state: 'Nagaland',
      location: 'Mokokchung Road',
      hazardType: 'Debris Slide',
      severity: 'Watch',
      description: 'Report owned by Account A',
      reporterId: userAId,
      reporterName: 'Account A (Brother)',
      reporterPhone: sharedPhone,
      status: 'submitted',
      source: 'citizen',
      isDeleted: false,
    });
    userAReportId = repA.reportId;

    // 6. Account A exports their personal data
    const exportARes = await fetch(`${BASE_URL}/api/v1/users/me/export`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    check('Account A export succeeds with HTTP 200', exportARes.status === 200);

    const exportAJson = (await exportARes.json()) as any;
    const exportedReportIds = (exportAJson.reports || []).map((r: any) => r.reportId);

    // Assertions for Export Ownership Isolation
    check(
      'Account A export includes Account A own report',
      exportedReportIds.includes(userAReportId)
    );
    check(
      'Account A export strictly EXCLUDES Account B report despite shared phone number',
      !exportedReportIds.includes(userBReportId)
    );
    check(
      'Account A export strictly EXCLUDES anonymous public report despite shared phone number',
      !exportedReportIds.includes(anonReportId)
    );
    check(
      'Account A export contains exactly 1 owned report',
      exportedReportIds.length === 1
    );

    // Verify strict projection on exported report
    const repExported = exportAJson.reports?.[0];
    check('Exported report excludes internal ipAddress', repExported?.ipAddress === undefined);
    check('Exported report excludes internal verificationNotes', repExported?.verificationNotes === undefined);

    // ── SCENARIO 2: REFRESH-TOKEN REUSE AFTER PASSWORD CHANGES ──
    console.log('\n--- Scenario 2: Refresh-Token Reuse After Password Changes ---');

    const multiUserEmail = `edge.multi.${timestamp}@terra360.in`;

    // 1. User registers
    await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.110',
      },
      body: JSON.stringify({
        name: 'Multi Device User',
        email: multiUserEmail,
        password: passwordInitial,
        role: 'citizen',
      }),
    });

    // 2. User logs in on Device A
    const loginDeviceARes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Device-A-MacBook-Chrome/120.0',
        'X-Forwarded-For': '198.51.100.111',
      },
      body: JSON.stringify({ email: multiUserEmail, password: passwordInitial }),
    });
    const deviceAJson = (await loginDeviceARes.json()) as any;
    const tokenAInitial = deviceAJson.data?.accessToken;
    const cookieDeviceA = extractCookie(loginDeviceARes.headers, 'refreshToken') || '';
    check('Device A login succeeds (HTTP 200)', loginDeviceARes.status === 200);

    // 3. The same user logs in on Device B
    const loginDeviceBRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Device-B-Android-Mobile/14.0',
        'X-Forwarded-For': '198.51.100.112',
      },
      body: JSON.stringify({ email: multiUserEmail, password: passwordInitial }),
    });
    const cookieDeviceB = extractCookie(loginDeviceBRes.headers, 'refreshToken') || '';
    check('Device B login succeeds (HTTP 200)', loginDeviceBRes.status === 200);

    // Check DB state: User must have exactly 2 active sessions
    const dbBeforePasswordChange = await User.findOne({ email: multiUserEmail }).select('+refreshTokens');
    check(
      'Database contains exactly 2 active refresh token sessions',
      dbBeforePasswordChange?.refreshTokens?.length === 2
    );

    // 4. Device A changes the account password
    const pwChangeRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAInitial}`,
        Cookie: `refreshToken=${cookieDeviceA}`,
      },
      body: JSON.stringify({
        currentPassword: passwordInitial,
        newPassword: passwordUpdated,
        confirmPassword: passwordUpdated,
      }),
    });
    check('Device A changes account password (HTTP 200)', pwChangeRes.status === 200);

    // 5. Confirm Device A session remains valid in database
    const dbAfterPasswordChange = await User.findOne({ email: multiUserEmail }).select('+refreshTokens');
    check(
      'After password change: Database has exactly 1 active session (Device A preserved, Device B tombstoned)',
      dbAfterPasswordChange?.refreshTokens?.filter((s: any) => s.status === 'active' || !s.status).length === 1 &&
        dbAfterPasswordChange?.refreshTokens?.some((s: any) => s.status === 'revoked') === true
    );

    // Confirm Device A access token remains valid for protected endpoints
    const deviceAPostChangeCheck = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${tokenAInitial}` },
    });
    check(
      'Device A access token remains valid immediately after password change (HTTP 200)',
      deviceAPostChangeCheck.status === 200
    );

    // 6. Attempt a refresh using Device B's revoked refresh token
    const deviceBRefreshAttempt = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${cookieDeviceB}`,
        'X-Forwarded-For': '198.51.100.113',
      },
    });
    const deviceBRefreshJson = (await deviceBRefreshAttempt.json()) as any;
    check(
      'Device B refresh attempt is rejected with HTTP 401',
      deviceBRefreshAttempt.status === 401
    );
    check(
      'Device B rejection code is SESSION_REVOKED (tombstone architecture)',
      deviceBRefreshJson.error?.code === 'SESSION_REVOKED'
    );

    // 7. Verify the resulting database refresh-token state
    const dbAfterDeviceBAttempt = await User.findOne({ email: multiUserEmail }).select('+refreshTokens');
    console.log(`    [DB Refresh Tokens Count after Device B trigger]: ${dbAfterDeviceBAttempt?.refreshTokens?.length}`);
    check(
      'Resulting DB refreshTokens preserves tombstones and active sessions (not wiped)',
      (dbAfterDeviceBAttempt?.refreshTokens?.length || 0) >= 1
    );

    // 8. Check whether Device A remains authenticated and able to refresh
    // 8a. Device A's current access token (in memory) is still valid for API calls until its 15m expiration:
    const deviceAAccessTokenCheck = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${tokenAInitial}` },
    });
    check(
      'Device A current access token remains valid for API calls (HTTP 200)',
      deviceAAccessTokenCheck.status === 200
    );

    // 8b. Device A subsequent refresh succeeds because its session was preserved and not wiped!
    const deviceASubsequentRefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${cookieDeviceA}`,
        'X-Forwarded-For': '198.51.100.114',
      },
    });
    check(
      'Device A subsequent refresh attempt succeeds with HTTP 200 (tombstone preservation verified)',
      deviceASubsequentRefresh.status === 200
    );

    // Cleanup created test documents
    await Report.deleteMany({
      reportId: { $in: [userAReportId, userBReportId, anonReportId] },
    });
    await User.deleteMany({
      email: { $in: [userAEmail, userBEmail, multiUserEmail] },
    });
    console.log('\n🧹 Cleaned up all edge-case test entities from MongoDB.');
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEdgeCaseTests().catch((err) => {
  console.error('Fatal edge-case test error:', err);
  process.exit(1);
});

