import assert from 'assert';

const API_BASE = 'http://localhost:5000/api/v1';

async function runE2EAudit() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 PORTAL AUTHENTICATION & PERSISTENCE AUDIT');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  let refreshTokenCookie = '';
  let accessToken = '';

  await test('1. Login returns access token and secure HttpOnly cookie', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'officer@terra360.in',
        password: 'Password123!',
      }),
    });

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken, 'Access token missing in login response');
    assert.strictEqual(body.data.user.role, 'officer');
    accessToken = body.data.accessToken;

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header missing');
    assert.ok(setCookie.includes('refreshToken='), 'refreshToken missing in Set-Cookie');
    assert.ok(setCookie.toLowerCase().includes('httponly'), 'HttpOnly missing in Set-Cookie');
    assert.ok(setCookie.toLowerCase().includes('samesite=none'), 'SameSite=None missing in Set-Cookie');
    assert.ok(setCookie.toLowerCase().includes('secure'), 'Secure attribute missing in Set-Cookie');
    assert.ok(setCookie.toLowerCase().includes('path=/'), 'Path=/ missing in Set-Cookie');

    // Extract cookie for subsequent tests
    const match = setCookie.match(/refreshToken=([^;]+)/);
    assert.ok(match, 'Failed to extract refreshToken value');
    refreshTokenCookie = `refreshToken=${match[1]}`;
  });

  await test('2. Authenticated API request with Bearer token succeeds', async () => {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Origin: 'http://localhost:3000',
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, 'officer@terra360.in');
  });

  await test('3. Cross-origin / CORS headers allow credentials and validate origin', async () => {
    // Test CORS on preflight OPTIONS or public endpoint with credentials
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://terra360-preview.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Cookie',
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCredentials = res.headers.get('access-control-allow-credentials');
    assert.strictEqual(allowOrigin, 'https://terra360-preview.vercel.app');
    assert.strictEqual(allowCredentials, 'true');
  });

  let newAccessToken = '';
  let rotatedRefreshTokenCookie = '';

  await test('4. Browser refresh simulation: Token refresh rotates token and preserves session', async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshTokenCookie,
        Origin: 'http://localhost:3000',
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken);
    newAccessToken = body.data.accessToken;

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Rotation must issue a new Set-Cookie header');
    const match = setCookie.match(/refreshToken=([^;]+)/);
    assert.ok(match);
    rotatedRefreshTokenCookie = `refreshToken=${match[1]}`;
  });

  await test('5. Old refresh token reuse detection triggers revocation (Security PRD §13.8)', async () => {
    // Attempting to use the old rotated token should be caught by reuse detection
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshTokenCookie, // Old token before rotation
        Origin: 'http://localhost:3000',
      },
    });

    assert.strictEqual(res.status, 401, 'Old token reuse must return 401');
    const body = await res.json();
    assert.strictEqual(body.error.code, 'TOKEN_REUSE_DETECTED');
  });

  await test('6. Unauthenticated protected request returns 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  await test('7. Logout endpoint clears cookie and revokes session', async () => {
    // Log in again to obtain a fresh session for logout testing
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@terra360.in', password: 'Password123!' }),
    });
    const setCookie = loginRes.headers.get('set-cookie')!;
    const match = setCookie.match(/refreshToken=([^;]+)/)!;
    const activeCookie = `refreshToken=${match[1]}`;

    // Perform logout
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: activeCookie,
        Origin: 'http://localhost:3000',
      },
    });

    assert.strictEqual(logoutRes.status, 200);
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert.ok(logoutCookie, 'Logout must send Set-Cookie clearing the cookie');
    assert.ok(
      logoutCookie.includes('refreshToken=;') ||
        logoutCookie.includes('Max-Age=0') ||
        logoutCookie.toLowerCase().includes('expires='),
      'Set-Cookie must clear or expire the refreshToken'
    );

    // Subsequent refresh using the logged-out token must fail
    const refreshAfterLogout = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: activeCookie },
    });
    assert.strictEqual(refreshAfterLogout.status, 401, 'Logged-out session must not refresh');
  });

  await test('8. Role-based API access control: Citizen blocked from officer endpoints with 403', async () => {
    // Log in as Citizen
    const citizenLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@terra360.in', password: 'Password123!' }),
    });
    assert.strictEqual(citizenLogin.status, 200);
    const citizenData = await citizenLogin.json();
    const citizenToken = citizenData.data.accessToken;

    // Attempt to access officer reports endpoint with citizen token
    const officerEndpointRes = await fetch(`${API_BASE}/reports`, {
      headers: {
        Authorization: `Bearer ${citizenToken}`,
      },
    });
    assert.strictEqual(officerEndpointRes.status, 403, 'Citizen must receive 403 FORBIDDEN on officer routes');
    const errBody = await officerEndpointRes.json();
    assert.strictEqual(errBody.error.code, 'FORBIDDEN');
  });

  await test('9. Concurrent API requests with Bearer token succeed in parallel', async () => {
    // Log in as Officer
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@terra360.in', password: 'Password123!' }),
    });
    const data = await loginRes.json();
    const token = data.data.accessToken;

    // Dispatch 5 concurrent protected requests
    const promises = Array.from({ length: 5 }, () =>
      fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.status)
    );

    const statuses = await Promise.all(promises);
    assert.ok(statuses.every((s) => s === 200), `All 5 concurrent requests must return 200, got ${statuses.join(',')}`);
  });

  await test('10. Tampered or invalid refresh token rejected with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: 'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature',
      },
    });
    assert.strictEqual(res.status, 401);
  });

  console.log('\n========================================================');
  console.log(`📊 AUDIT RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
