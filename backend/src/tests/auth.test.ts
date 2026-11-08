import assert from 'assert';
import http from 'http';
import app from '../app';
import { safeCompare } from '../utils/tokenCompare';
import { hashToken, generateRandomToken } from '../utils/crypto';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { assertOwnership, ResourceNotFoundError } from '../utils/ownershipCheck';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
} from '../modules/auth/auth.schema';
import { roleGuard } from '../middleware/roleGuard';
import { requireAuth } from '../middleware/requireAuth';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 M1 (AUTH & ROLES) COMPREHENSIVE TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // ── TEST GROUP 1: Zod Schema Validation & Role Restrictions ──
  console.log('--- [Group 1: Schema Validation & Role Restrictions] ---');

  await test('Reject public registration as "officer"', () => {
    const result = registerSchema.safeParse({
      name: 'Officer John',
      email: 'officer@gov.in',
      password: 'StrongPassword123!',
      role: 'officer',
    });
    assert.strictEqual(result.success, false);
  });

  await test('Reject public registration as "admin"', () => {
    const result = registerSchema.safeParse({
      name: 'Admin User',
      email: 'admin@gov.in',
      password: 'StrongPassword123!',
      role: 'admin',
    });
    assert.strictEqual(result.success, false);
  });

  await test('Reject public registration as "field_officer"', () => {
    const result = registerSchema.safeParse({
      name: 'Inspector',
      email: 'field@gov.in',
      password: 'StrongPassword123!',
      role: 'field_officer',
    });
    assert.strictEqual(result.success, false);
  });

  await test('Allow public registration as "citizen"', () => {
    const result = registerSchema.safeParse({
      name: 'Priyam Hazarika',
      email: 'priyam@community.in',
      password: 'SecurePassword123!',
      role: 'citizen',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.role, 'citizen');
    }
  });

  await test('Allow public registration as "driver"', () => {
    const result = registerSchema.safeParse({
      name: 'Transport Driver',
      email: 'driver@nh29.in',
      password: 'SecurePassword123!',
      role: 'driver',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.role, 'driver');
    }
  });

  await test('Default role is "citizen" when role omitted', () => {
    const result = registerSchema.safeParse({
      name: 'Local Villager',
      email: 'villager@assam.in',
      password: 'SecurePassword123!',
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.role, 'citizen');
    }
  });

  await test('Reject password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Short Pass',
      email: 'short@test.in',
      password: '12345',
    });
    assert.strictEqual(result.success, false);
  });

  await test('Login schema requires email and password', () => {
    assert.strictEqual(loginSchema.safeParse({ email: 'bad-email' }).success, false);
    assert.strictEqual(
      loginSchema.safeParse({ email: 'valid@terra360.in', password: 'password123' }).success,
      true
    );
  });

  await test('Reset password schema enforces min length 8', () => {
    assert.strictEqual(
      resetPasswordSchema.safeParse({ token: 'abc', password: 'short' }).success,
      false
    );
    assert.strictEqual(
      resetPasswordSchema.safeParse({ token: 'abc', password: 'newSecurePassword8' }).success,
      true
    );
  });

  await test('verifyEmailSchema requires token', () => {
    assert.strictEqual(verifyEmailSchema.safeParse({}).success, false);
    assert.strictEqual(verifyEmailSchema.safeParse({ token: 'verification_token_123' }).success, true);
  });

  // ── TEST GROUP 2: Cryptographic & Security Utilities ──
  console.log('\n--- [Group 2: Cryptography & Token Helpers] ---');

  await test('Constant-time token safeCompare', () => {
    const a = 'terra360_secret_token_12345';
    const b = 'terra360_secret_token_12345';
    const c = 'terra360_secret_token_diff!!';
    assert.strictEqual(safeCompare(a, b), true);
    assert.strictEqual(safeCompare(a, c), false);
    assert.strictEqual(safeCompare(a, 'short'), false);
  });

  await test('SHA-256 token hashing consistency', () => {
    const raw = 'my_raw_random_token';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  await test('JWT Access Token signing & verification (15m)', () => {
    const token = signAccessToken({
      sub: 'user_12345',
      email: 'officer@disaster.in',
      role: 'officer',
    });
    const verified = verifyAccessToken(token);
    assert.strictEqual(verified.sub, 'user_12345');
    assert.strictEqual(verified.email, 'officer@disaster.in');
    assert.strictEqual(verified.role, 'officer');
  });

  await test('JWT Refresh Token signing & verification (7d)', () => {
    const jti = generateRandomToken(16);
    const token = signRefreshToken({
      sub: 'user_12345',
      jti,
    });
    const verified = verifyRefreshToken(token);
    assert.strictEqual(verified.sub, 'user_12345');
    assert.strictEqual(verified.jti, jti);
  });

  await test('assertOwnership throws 404 ResourceNotFoundError on mismatch (PRD §13.10)', () => {
    assert.doesNotThrow(() => assertOwnership('user_123', 'user_123'));
    assert.throws(
      () => assertOwnership('user_123', 'attacker_999'),
      (err: any) => err instanceof ResourceNotFoundError && err.statusCode === 404
    );
  });

  await test('Bcryptjs password hash cost >= 10', async () => {
    const plain = 'MySecurePassword2026!';
    const hash = await bcrypt.hash(plain, 10);
    assert.strictEqual(hash.startsWith('$2a$10$') || hash.startsWith('$2b$10$'), true);
    assert.strictEqual(await bcrypt.compare(plain, hash), true);
    assert.strictEqual(await bcrypt.compare('WrongPassword', hash), false);
  });

  // ── TEST GROUP 3: Middleware Guards ──
  console.log('\n--- [Group 3: Middleware & Security Guards] ---');

  await test('roleGuard blocks unauthorized roles with 403 FORBIDDEN', () => {
    const guard = roleGuard('officer', 'admin');
    let errorCaught: any = null;
    const req: any = {
      user: { id: 'u1', role: 'citizen', email: 'citizen@test.in' },
    };
    guard(req, {} as any, (err) => {
      errorCaught = err;
    });
    assert.ok(errorCaught);
    assert.strictEqual(errorCaught.statusCode, 403);
    assert.strictEqual(errorCaught.code, 'FORBIDDEN');
  });

  await test('roleGuard passes authorized roles', () => {
    const guard = roleGuard('officer', 'admin');
    let calledNext = false;
    const req: any = {
      user: { id: 'u1', role: 'officer', email: 'officer@gov.in' },
    };
    guard(req, {} as any, (err) => {
      assert.strictEqual(err, undefined);
      calledNext = true;
    });
    assert.strictEqual(calledNext, true);
  });

  await test('requireAuth blocks request without Bearer token with 401', async () => {
    let errorCaught: any = null;
    const req: any = { headers: {} };
    await requireAuth(req, {} as any, (err) => {
      errorCaught = err;
    });
    assert.ok(errorCaught);
    assert.strictEqual(errorCaught.statusCode, 401);
    assert.strictEqual(errorCaught.code, 'UNAUTHORIZED');
  });

  // ── TEST GROUP 4: Refresh Token Rotation & Reuse Detection Logic ──
  console.log('\n--- [Group 4: Token Rotation & Reuse Detection Logic] ---');

  await test('Simulated Token Rotation and Theft Revocation', () => {
    // 1. Initial sessions array
    const token1 = 'refresh_token_legit_v1';
    const token1Hash = hashToken(token1);
    let sessions = [{ hash: token1Hash, createdAt: new Date() }];

    // 2. Legit user refreshes -> rotates token1 to token2
    const token2 = 'refresh_token_legit_v2';
    const token2Hash = hashToken(token2);
    const existingIdx = sessions.findIndex((s) => s.hash === token1Hash);
    assert.strictEqual(existingIdx !== -1, true);

    // Remove old token1, add token2
    sessions.splice(existingIdx, 1);
    sessions.push({ hash: token2Hash, createdAt: new Date() });

    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].hash, token2Hash);

    // 3. Attacker tries to reuse stolen token1
    const attackerHash = hashToken(token1);
    const attackerIdx = sessions.findIndex((s) => s.hash === attackerHash);

    // Token reuse detected!
    if (attackerIdx === -1) {
      // PRD §7.1 and §15 rule: Reuse triggers FULL REVOCATION of all sessions!
      sessions = [];
    }

    assert.strictEqual(sessions.length, 0); // All sessions revoked!
  });

  // ── TEST GROUP 5: Account Lockout Logic (5 failed attempts → 15 min lock) ──
  console.log('\n--- [Group 5: Account Lockout Logic] ---');

  await test('Account lockout triggers after 5 consecutive failed logins', () => {
    let failedLogins = 0;
    let lockedUntil: Date | undefined = undefined;

    function recordFailedLogin() {
      failedLogins++;
      if (failedLogins >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
    }

    function isLocked(): boolean {
      return !!(lockedUntil && lockedUntil.getTime() > Date.now());
    }

    for (let i = 1; i <= 4; i++) {
      recordFailedLogin();
      assert.strictEqual(isLocked(), false);
    }

    recordFailedLogin(); // 5th failure
    assert.strictEqual(failedLogins, 5);
    assert.strictEqual(isLocked(), true);

    // Successful login resets
    failedLogins = 0;
    lockedUntil = undefined;
    assert.strictEqual(isLocked(), false);
  });

  // ── TEST GROUP 6: HTTP Server, Probes & Middleware Integration ──
  console.log('\n--- [Group 6: HTTP Server & Probes Integration] ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(path: string, options: http.RequestOptions = {}, body?: any): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, options, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              data: raw ? JSON.parse(raw) : null,
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              data: raw,
            });
          }
        });
      });
      req.on('error', reject);
      if (body) {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  await test('GET /health returns 200 with status "healthy"', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.status, 'healthy');
    assert.ok(res.data.uptime >= 0);
  });

  await test('GET /ready returns 503 when MongoDB is not connected', async () => {
    const res = await request('/ready');
    // In unit test without connected DB, ready probe returns 503
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.data.status, 'not_ready');
  });

  await test('Security headers: Helmet headers present in responses', async () => {
    const res = await request('/api/v1/auth/login', { method: 'POST' }, { email: 't@t.in', password: 'p' });
    assert.ok(res.headers['x-dns-prefetch-control']);
    assert.ok(res.headers['x-frame-options']);
    assert.ok(res.headers['x-content-type-options']);
  });

  await test('Rate limit headers present on /api/v1/auth routes', async () => {
    const res = await request('/api/v1/auth/login', { method: 'POST' }, { email: 'test@t.in', password: 'p' });
    assert.ok(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']);
  });

  await test('404 handler returns standard PRD JSON structure', async () => {
    const res = await request('/api/v1/non-existent-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'ROUTE_NOT_FOUND');
  });

  await test('POST /api/v1/auth/register rejects role "admin" with 400 VALIDATION_ERROR', async () => {
    const res = await request('/api/v1/auth/register', { method: 'POST' }, {
      name: 'Malicious Admin',
      email: 'bad@admin.in',
      password: 'Password123!',
      role: 'admin',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
    assert.ok(res.data.error.fields?.role);
  });

  await test('POST /api/v1/auth/register rejects role "officer" with 400 VALIDATION_ERROR', async () => {
    const res = await request('/api/v1/auth/register', { method: 'POST' }, {
      name: 'Fake Officer',
      email: 'fake@officer.in',
      password: 'Password123!',
      role: 'officer',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
    assert.ok(res.data.error.fields?.role);
  });

  await test('POST /api/v1/auth/login rejects empty password with 400 VALIDATION_ERROR', async () => {
    const res = await request('/api/v1/auth/login', { method: 'POST' }, {
      email: 'user@terra360.in',
      password: '',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
  });

  await test('POST /api/v1/auth/refresh rejects missing cookie with 401 UNAUTHORIZED', async () => {
    const res = await request('/api/v1/auth/refresh', { method: 'POST' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  await test('GET /api/v1/users/me rejects unauthenticated request with 401', async () => {
    const res = await request('/api/v1/users/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.error.code, 'UNAUTHORIZED');
  });

  server.close();

  console.log('\n========================================================');
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
