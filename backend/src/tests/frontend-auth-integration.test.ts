export {};

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { hashToken, generateRandomToken } from '../utils/crypto';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Helper to extract cookies from response headers
function extractCookie(headers: Headers, cookieName: string): string | null {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runAuthIntegrationTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 — PHASE 3.4 FRONTEND AUTH INTEGRATION TESTS');
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

  // Connect to DB for state cleanup and token injection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, { dbName: 'Terra360' });
  }

  const timestamp = Date.now();
  const citizenEmail = `test.citizen.${timestamp}@terra360.in`;
  const driverEmail = `test.driver.${timestamp}@terra360.in`;
  const testPassword = 'Password123!';

  try {
    // ── GROUP 1: PUBLIC REGISTRATION ──
    console.log('--- Group 1: Public Registration Flow ---');

    // Test 1: Register citizen
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.1',
        },
        body: JSON.stringify({
          name: 'Priya Sharma',
          email: citizenEmail,
          password: testPassword,
          role: 'citizen',
          phone: '+91 98765 00001',
          language: 'en',
        }),
      });

      const json = (await res.json()) as any;
      check('Citizen registration returns HTTP 201', res.status === 201);
      check('Citizen registration success is true', json.success === true);
      check('Citizen user role set to citizen', json.data?.user?.role === 'citizen');
      check('Password hash not returned in response', json.data?.user?.passwordHash === undefined);
    }

    // Test 2: Register driver
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.2',
        },
        body: JSON.stringify({
          name: 'Karan Thapa',
          email: driverEmail,
          password: testPassword,
          role: 'driver',
          phone: '+91 98765 00002',
        }),
      });

      const json = (await res.json()) as any;
      check('Driver registration returns HTTP 201', res.status === 201);
      check('Driver user role set to driver', json.data?.user?.role === 'driver');
    }

    // Test 3: Reject disallowed roles (admin, officer, field_officer)
    for (const disallowedRole of ['admin', 'officer', 'field_officer']) {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `198.51.100.${disallowedRole.length + 10}`,
        },
        body: JSON.stringify({
          name: 'Intruder',
          email: `intruder.${disallowedRole}.${timestamp}@terra360.in`,
          password: testPassword,
          role: disallowedRole,
        }),
      });

      check(
        `Disallowed role '${disallowedRole}' rejected with HTTP 400`,
        res.status === 400
      );
    }

    // Test 4: Reject duplicate email registration
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.3',
        },
        body: JSON.stringify({
          name: 'Duplicate Citizen',
          email: citizenEmail,
          password: testPassword,
          role: 'citizen',
        }),
      });

      check('Duplicate registration returns HTTP 409 Conflict', res.status === 409);
    }

    // Test 5: Validation errors on missing fields / short password
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.4',
        },
        body: JSON.stringify({
          name: 'A', // min 2
          email: 'invalid-email',
          password: '123', // min 8
        }),
      });

      const json = (await res.json()) as any;
      check('Invalid fields rejected with HTTP 400', res.status === 400);
      check('Field error contains email', !!json.error?.fields?.email);
      check('Field error contains password', !!json.error?.fields?.password);
      check('Field error contains name', !!json.error?.fields?.name);
    }

    // ── GROUP 2: LOGIN FLOW ──
    console.log('\n--- Group 2: Login Flow ---');

    let initialAccessToken = '';
    let initialRefreshTokenCookie = '';

    // Test 6: Valid login
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.5',
        },
        body: JSON.stringify({
          email: citizenEmail,
          password: testPassword,
        }),
      });

      const json = (await res.json()) as any;
      check('Valid login returns HTTP 200', res.status === 200);
      check('Returns accessToken in response body', typeof json.data?.accessToken === 'string');
      initialAccessToken = json.data?.accessToken;

      const setCookie = res.headers.get('set-cookie') || '';
      check('Sets refreshToken cookie', setCookie.includes('refreshToken='));
      check('Cookie is HttpOnly', setCookie.toLowerCase().includes('httponly'));
      check('Cookie path is scoped to /api/v1/auth', setCookie.includes('Path=/api/v1/auth'));
      check('Cookie SameSite is Strict', setCookie.toLowerCase().includes('samesite=strict'));

      initialRefreshTokenCookie = extractCookie(res.headers, 'refreshToken') || '';
    }

    // Test 7: Invalid credentials rejected
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.6',
        },
        body: JSON.stringify({
          email: citizenEmail,
          password: 'WrongPassword!',
        }),
      });

      const json = (await res.json()) as any;
      check('Invalid password returns HTTP 401', res.status === 401);
      check('Error code is INVALID_CREDENTIALS', json.error?.code === 'INVALID_CREDENTIALS');
    }

    // Test 8: Account lockout after 5 consecutive failed logins
    {
      const lockUserEmail = `locktest.${timestamp}@terra360.in`;
      // Create user
      await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.7',
        },
        body: JSON.stringify({
          name: 'Lockout Target',
          email: lockUserEmail,
          password: testPassword,
          role: 'citizen',
        }),
      });

      // 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': `198.51.100.${20 + i}`,
          },
          body: JSON.stringify({
            email: lockUserEmail,
            password: 'BadPassword',
          }),
        });
      }

      // 5th failed attempt triggers lockout
      const fifthRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.25',
        },
        body: JSON.stringify({
          email: lockUserEmail,
          password: 'BadPassword',
        }),
      });
      check('5th failed attempt still returns 401 INVALID_CREDENTIALS', fifthRes.status === 401);

      // 6th attempt even with correct password is now locked!
      const lockedRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.26',
        },
        body: JSON.stringify({
          email: lockUserEmail,
          password: testPassword,
        }),
      });

      const lockedJson = (await lockedRes.json()) as any;
      check('Subsequent login attempt returns HTTP 401', lockedRes.status === 401);
      check('Error code is ACCOUNT_LOCKED', lockedJson.error?.code === 'ACCOUNT_LOCKED');
      check(
        'Locked message indicates temporary lockout with minutes',
        lockedJson.error?.message?.includes('locked')
      );
    }

    // ── GROUP 3: SESSION RESTORATION & AUTH HEADER ──
    console.log('\n--- Group 3: Session Restoration & GET /api/v1/users/me ---');

    // Test 9: Access protected GET /api/v1/users/me with Bearer token
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${initialAccessToken}`,
        },
      });

      const json = (await res.json()) as any;
      check('GET /api/v1/users/me returns HTTP 200 with valid Bearer', res.status === 200);
      check('Returns authenticated citizen user profile', json.data?.user?.email === citizenEmail);
    }

    // Test 10: Access protected endpoint without Bearer token
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'GET',
      });
      check('GET /api/v1/users/me without token returns HTTP 401', res.status === 401);
    }

    // ── GROUP 4: REFRESH TOKEN ROTATION & MUTEX ──
    console.log('\n--- Group 4: Token Refresh & Rotation ---');

    let rotatedAccessToken = '';
    let rotatedRefreshTokenCookie = '';

    // Test 11: POST /api/v1/auth/refresh rotates tokens
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${initialRefreshTokenCookie}`,
          'X-Forwarded-For': '198.51.100.8',
        },
      });

      const json = (await res.json()) as any;
      check('Refresh endpoint returns HTTP 200', res.status === 200);
      check('Returns new rotated accessToken', typeof json.data?.accessToken === 'string');
      rotatedAccessToken = json.data?.accessToken;
      check('Rotated access token differs from initial', rotatedAccessToken !== initialAccessToken);

      rotatedRefreshTokenCookie = extractCookie(res.headers, 'refreshToken') || '';
      check('Sets newly rotated refreshToken cookie', !!rotatedRefreshTokenCookie);
      check(
        'Rotated cookie differs from old cookie',
        rotatedRefreshTokenCookie !== initialRefreshTokenCookie
      );
    }

    // Test 12: Token reuse detection: Reusing old refresh token revokes all sessions
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${initialRefreshTokenCookie}`, // Reusing old consumed token!
          'X-Forwarded-For': '198.51.100.9',
        },
      });

      const json = (await res.json()) as any;
      check('Reusing old refresh token is rejected with HTTP 401', res.status === 401);
      check('Error code is TOKEN_REUSE_DETECTED', json.error?.code === 'TOKEN_REUSE_DETECTED');

      // Now verify that even the rotated token was revoked because of reuse detection!
      const checkRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${rotatedRefreshTokenCookie}`,
          'X-Forwarded-For': '198.51.100.10',
        },
      });
      check('All sessions revoked after reuse detection (HTTP 401)', checkRes.status === 401);
    }

    // ── GROUP 5: LOGOUT FLOW ──
    console.log('\n--- Group 5: Logout Flow ---');

    // Test 13: Login fresh, then logout
    {
      const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.11',
        },
        body: JSON.stringify({
          email: citizenEmail,
          password: testPassword,
        }),
      });
      const logoutTokenCookie = extractCookie(loginRes.headers, 'refreshToken') || '';

      const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${logoutTokenCookie}`,
          'X-Forwarded-For': '198.51.100.12',
        },
      });

      const logoutJson = (await logoutRes.json()) as any;
      check('Logout returns HTTP 200', logoutRes.status === 200);
      check('Logout success is true', logoutJson.success === true);

      // Verify refresh with logged out token fails
      const postLogoutRefresh = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Cookie: `refreshToken=${logoutTokenCookie}`,
          'X-Forwarded-For': '198.51.100.13',
        },
      });
      check('Refresh after logout returns HTTP 401', postLogoutRefresh.status === 401);
    }

    // ── GROUP 6: PASSWORD & EMAIL VERIFICATION FLOWS ──
    console.log('\n--- Group 6: Password Recovery & Email Verification Flows ---');

    // Test 14: Forgot password generic response (prevents account enumeration)
    {
      const resExisting = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.14',
        },
        body: JSON.stringify({ email: citizenEmail }),
      });
      const jsonExisting = (await resExisting.json()) as any;
      check('Forgot password with existing email returns HTTP 200', resExisting.status === 200);
      check('Returns generic notice message', jsonExisting.data?.message?.includes('password reset link'));

      const resNonExisting = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.15',
        },
        body: JSON.stringify({ email: 'nonexistent@terra360.in' }),
      });
      check('Forgot password with nonexistent email returns HTTP 200 (no leak)', resNonExisting.status === 200);
    }

    // Test 15: Verify email with invalid token returns 400
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.16',
        },
        body: JSON.stringify({ token: 'invalid-token-12345' }),
      });
      check('Verify email with bogus token returns HTTP 400', res.status === 400);
    }

    // Test 16: Reset password with invalid token returns 400
    {
      const res = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.17',
        },
        body: JSON.stringify({
          token: 'invalid-token-12345',
          password: 'NewStrongPassword123!',
        }),
      });
      check('Reset password with bogus token returns HTTP 400', res.status === 400);
    }

    // Test 17: Full Email Verification Cycle
    {
      const rawVerifyToken = generateRandomToken(32);
      const hashedToken = hashToken(rawVerifyToken);

      // Seed token on citizen user in DB
      await User.updateOne(
        { email: citizenEmail },
        {
          emailVerified: false,
          emailVerificationToken: hashedToken,
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      );

      const res = await fetch(`${BASE_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.18',
        },
        body: JSON.stringify({ token: rawVerifyToken }),
      });

      const json = (await res.json()) as any;
      check('Verify email with valid token returns HTTP 200', res.status === 200);
      check('Returns success message', json.data?.message?.includes('successfully verified'));

      const updatedUser = await User.findOne({ email: citizenEmail });
      check('User emailVerified is now true in database', updatedUser?.emailVerified === true);
    }

    // Test 18: Full Password Reset Cycle
    {
      const rawResetToken = generateRandomToken(32);
      const hashedToken = hashToken(rawResetToken);
      const newPassword = 'NewlyUpdatedPassword999!';

      // Seed reset token in DB
      await User.updateOne(
        { email: citizenEmail },
        {
          passwordResetToken: hashedToken,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }
      );

      const res = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.19',
        },
        body: JSON.stringify({
          token: rawResetToken,
          password: newPassword,
        }),
      });

      const json = (await res.json()) as any;
      check('Reset password with valid token returns HTTP 200', res.status === 200);
      check('Returns password reset success message', json.data?.message?.includes('successfully reset'));

      // Old password must fail
      const oldLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.30',
        },
        body: JSON.stringify({
          email: citizenEmail,
          password: testPassword,
        }),
      });
      check('Login with old password fails (HTTP 401)', oldLoginRes.status === 401);

      // New password must succeed
      const newLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.31',
        },
        body: JSON.stringify({
          email: citizenEmail,
          password: newPassword,
        }),
      });
      check('Login with newly reset password succeeds (HTTP 200)', newLoginRes.status === 200);
    }
  } finally {
    // Clean up test accounts to leave database clean
    await User.deleteMany({
      email: {
        $in: [
          citizenEmail,
          driverEmail,
          `locktest.${timestamp}@terra360.in`,
        ],
      },
    });
    console.log('\n🧹 Cleaned up temporary test users from MongoDB.');
    await mongoose.disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

