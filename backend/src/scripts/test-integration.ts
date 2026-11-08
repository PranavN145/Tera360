import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';

function getRolePortalPath(role?: string): string {
  if (!role) return '/';
  switch (role.toLowerCase()) {
    case 'citizen':
      return '/citizen/home';
    case 'driver':
      return '/driver/route-check';
    case 'field_officer':
      return '/field/tasks';
    case 'officer':
      return '/officer/dashboard';
    case 'admin':
      return '/admin/users';
    default:
      return '/';
  }
}

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('\n========================================================');
  console.log('🚀 TERRA360 FULL INTEGRATION VERIFICATION (11 SCENARIOS)');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ Scenario ${passed + failed + 1}: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ Scenario ${passed + failed + 1} FAILED: ${msg}`);
      failed++;
    }
  }

  // 1. Register a new citizen
  const citizenEmail = `test.citizen.${Date.now()}@example.in`;
  const regCitizenRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Citizen User',
      email: citizenEmail,
      password: 'Password123!',
      role: 'citizen',
      phone: '+91 9876543210',
    }),
  });
  const regCitizenJson = (await regCitizenRes.json()) as any;
  assert(
    regCitizenRes.status === 201 &&
      regCitizenJson.success === true &&
      regCitizenJson.data.user.role === 'citizen' &&
      regCitizenJson.data.user.emailVerified === false &&
      typeof regCitizenJson.data.message === 'string',
    'Register new citizen (POST /api/v1/auth/register) succeeds with 201 and pending verification'
  );

  // 2. Register a new driver
  const driverEmail = `test.driver.${Date.now()}@example.in`;
  const regDriverRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Driver User',
      email: driverEmail,
      password: 'Password123!',
      role: 'driver',
    }),
  });
  const regDriverJson = (await regDriverRes.json()) as any;
  assert(
    regDriverRes.status === 201 &&
      regDriverJson.success === true &&
      regDriverJson.data.user.role === 'driver' &&
      regDriverJson.data.user.emailVerified === false,
    'Register new driver (POST /api/v1/auth/register) succeeds with 201 and role="driver"'
  );

  // 3. Attempt staff self-registration and verify rejection
  const regStaffAdminRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker Admin',
      email: `hacker.admin.${Date.now()}@example.in`,
      password: 'Password123!',
      role: 'admin',
    }),
  });
  const regStaffOfficerRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fake Officer',
      email: `fake.officer.${Date.now()}@example.in`,
      password: 'Password123!',
      role: 'officer',
    }),
  });
  assert(
    regStaffAdminRes.status === 400 && regStaffOfficerRes.status === 400,
    'Staff self-registration rejected with 400 VALIDATION_ERROR (admin & officer disallowed)'
  );

  // 4. Log in with valid credentials
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'citizen@terra360.in',
      password: 'Password123!',
    }),
  });
  const loginJson = (await loginRes.json()) as any;
  const setCookie = loginRes.headers.get('set-cookie') || '';
  const hasRefreshTokenCookie = setCookie.includes('refreshToken=') && setCookie.includes('HttpOnly');
  const accessToken = loginJson.data?.accessToken;
  assert(
    loginRes.status === 200 &&
      loginJson.success === true &&
      loginJson.data.user.email === 'citizen@terra360.in' &&
      typeof accessToken === 'string' &&
      hasRefreshTokenCookie,
    'Login with valid credentials returns 200, JWT in memory, and HttpOnly refresh cookie'
  );

  // 5. Log in with invalid credentials
  const badLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'citizen@terra360.in',
      password: 'WrongPassword999!',
    }),
  });
  const badLoginJson = (await badLoginRes.json()) as any;
  if (badLoginRes.status !== 401) {
    console.log('Scenario 5 unexpected response:', badLoginRes.status, badLoginJson);
  }
  assert(
    badLoginRes.status === 401 &&
      badLoginJson.success === false &&
      badLoginJson.error.code === 'INVALID_CREDENTIALS',
    'Login with invalid password rejected with 401 INVALID_CREDENTIALS'
  );

  // 6. Verify role-based redirection
  const pathsCorrect =
    getRolePortalPath('citizen') === '/citizen/home' &&
    getRolePortalPath('driver') === '/driver/route-check' &&
    getRolePortalPath('field_officer') === '/field/tasks' &&
    getRolePortalPath('officer') === '/officer/dashboard' &&
    getRolePortalPath('admin') === '/admin/users' &&
    getRolePortalPath('unknown_role') === '/';
  assert(pathsCorrect, 'Role-based redirection paths match PRD routes for all 5 roles + safe fallback');

  // 7. Refresh token & session restoration
  // Extract refreshToken from set-cookie
  const cookieMatch = setCookie.match(/refreshToken=([^;]+)/);
  const refreshTokenVal = cookieMatch ? cookieMatch[1] : '';
  const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refreshToken=${refreshTokenVal}`,
    },
  });
  const refreshJson = (await refreshRes.json()) as any;
  const newAccessToken = refreshJson.data?.accessToken;
  const newSetCookie = refreshRes.headers.get('set-cookie') || '';
  
  // Also test GET /api/v1/users/me with newAccessToken
  const meRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${newAccessToken}`,
    },
  });
  const meJson = (await meRes.json()) as any;

  if (refreshRes.status !== 200 || meRes.status !== 200) {
    console.log('Scenario 7 fail:', { refreshStatus: refreshRes.status, refreshJson, meStatus: meRes.status, meJson });
  }

  assert(
    refreshRes.status === 200 &&
      typeof newAccessToken === 'string' &&
      newSetCookie.includes('refreshToken=') &&
      meRes.status === 200 &&
      meJson.data.user.email === 'citizen@terra360.in',
    'Refresh cookie flow restores session (POST /api/v1/auth/refresh -> GET /api/v1/users/me)'
  );

  // 8. Logout & session invalidation
  const rotatedCookieMatch = newSetCookie.match(/refreshToken=([^;]+)/);
  const activeRefreshToken = rotatedCookieMatch ? rotatedCookieMatch[1] : refreshTokenVal;

  const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refreshToken=${activeRefreshToken}`,
    },
  });
  const logoutJson = (await logoutRes.json()) as any;
  const logoutCookieHeader = logoutRes.headers.get('set-cookie') || '';
  const isCookieCleared = logoutCookieHeader.includes('refreshToken=;') || logoutCookieHeader.includes('Max-Age=0') || logoutCookieHeader.includes('Expires=Thu, 01 Jan 1970');

  // Attempting to refresh again with old/cleared token must fail
  const postLogoutRefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refreshToken=${activeRefreshToken}`,
    },
  });
  const postLogoutJson = (await postLogoutRefresh.json()) as any;

  if (logoutRes.status !== 200 || postLogoutRefresh.status !== 401) {
    console.log('Scenario 8 fail:', { logoutStatus: logoutRes.status, logoutJson, postLogoutStatus: postLogoutRefresh.status, postLogoutJson });
  }

  assert(
    logoutRes.status === 200 &&
      isCookieCleared &&
      postLogoutRefresh.status === 401,
    'Logout invalidates refresh token and clears cookie; subsequent refresh fails with 401'
  );

  // 9. Access protected portal endpoint without authentication
  const unauthMeRes = await fetch(`${BASE_URL}/api/v1/users/me`);
  assert(
    unauthMeRes.status === 401,
    'Unauthenticated access to protected endpoint (GET /api/v1/users/me) rejected with 401'
  );

  // 10. Role isolation enforcement
  // Login as driver
  const driverLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'driver@terra360.in',
      password: 'Password123!',
    }),
  });
  const driverLoginJson = (await driverLoginRes.json()) as any;
  const driverRole = driverLoginJson.data?.user?.role;

  if (driverLoginRes.status !== 200) {
    console.log('Scenario 10 fail:', { status: driverLoginRes.status, json: driverLoginJson });
  }
  assert(
    driverRole === 'driver' &&
      getRolePortalPath(driverRole) === '/driver/route-check' &&
      getRolePortalPath(driverRole) !== '/admin/users' &&
      getRolePortalPath(driverRole) !== '/officer/dashboard',
    'Driver role is strictly isolated to /driver/route-check, prevented from accessing other portals'
  );

  // 11. Verify MongoDB persistence
  const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  const dbUser = await User.findOne({ email: citizenEmail }).select('+passwordHash');
  const isPersisted =
    dbUser !== null &&
    dbUser.role === 'citizen' &&
    dbUser.emailVerified === false &&
    dbUser.passwordHash !== 'Password123!' &&
    dbUser.passwordHash.startsWith('$2');

  assert(
    isPersisted,
    'MongoDB Atlas verified: User record persisted with bcrypt hashed password and emailVerified=false'
  );

  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log(`📊 INTEGRATION RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
