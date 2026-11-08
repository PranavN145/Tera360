export {};

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

function extractCookie(headers: Headers, cookieName: string): string | null {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runAccountIntegrationTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 — PHASE 3.5 USER ACCOUNT MANAGEMENT TESTS');
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

  // Connect to DB for cleanup
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, { dbName: 'Terra360' });
  }

  const timestamp = Date.now();
  const testEmail = `account.test.${timestamp}@terra360.in`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'NewSecretPassword456!';

  let accessToken = '';
  let refreshTokenCookie = '';
  let userId = '';

  try {
    // ── GROUP 1: UNAUTHENTICATED ACCESS TO ALL PROTECTED ENDPOINTS ──
    console.log('--- Group 1: Unauthenticated Access Rejections ---');

    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`);
      check('GET /users/me rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker' }),
      });
      check('PATCH /users/me rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: '1', newPassword: '2' }),
      });
      check('PATCH /users/me/password rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me/sessions`);
      check('GET /users/me/sessions rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me/sessions/dummy_id`, {
        method: 'DELETE',
      });
      check('DELETE /users/me/sessions/:id rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me/export`);
      check('GET /users/me/export rejected without token (HTTP 401)', res.status === 401);
    }
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText: 'DELETE' }),
      });
      check('DELETE /users/me rejected without token (HTTP 401)', res.status === 401);
    }

    // ── SETUP: REGISTER & LOGIN TEST CITIZEN ──
    console.log('\n--- Setup: Register & Authenticate Test User ---');
    {
      const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.50',
        },
        body: JSON.stringify({
          name: 'Anupam Borah',
          email: testEmail,
          password: initialPassword,
          role: 'citizen',
          phone: '+91 98765 11111',
          language: 'en',
        }),
      });
      check('Test user registered successfully (HTTP 201)', regRes.status === 201);

      const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.51',
        },
        body: JSON.stringify({
          email: testEmail,
          password: initialPassword,
        }),
      });
      const loginJson = (await loginRes.json()) as any;
      check('Test user logged in (HTTP 200)', loginRes.status === 200);

      accessToken = loginJson.data?.accessToken;
      userId = loginJson.data?.user?._id;
      refreshTokenCookie = extractCookie(loginRes.headers, 'refreshToken') || '';
      check('Captured valid accessToken', !!accessToken);
    }

    // ── GROUP 2: PROFILE RETRIEVAL & UPDATES ──
    console.log('\n--- Group 2: Profile Retrieval & Permitted Updates ---');
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json()) as any;
      check('GET /users/me returns HTTP 200', res.status === 200);
      check('User name matches registered name', json.data?.user?.name === 'Anupam Borah');
      check('User email matches registered email', json.data?.user?.email === testEmail);
      check('User role is citizen', json.data?.user?.role === 'citizen');
      check('Password hash is strictly excluded', json.data?.user?.passwordHash === undefined);
    }

    // Permitted update (name, phone, language)
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: 'Anupam K. Borah',
          phone: '+91 99999 88888',
          language: 'as',
        }),
      });
      const json = (await res.json()) as any;
      check('PATCH /users/me returns HTTP 200', res.status === 200);
      check('Name updated to Anupam K. Borah', json.data?.user?.name === 'Anupam K. Borah');
      check('Phone updated to +91 99999 88888', json.data?.user?.phone === '+91 99999 88888');
      check('Language updated to as (Assamese)', json.data?.user?.language === 'as');
    }

    // ── GROUP 3: ATTEMPTS TO MODIFY PROTECTED FIELDS ──
    console.log('\n--- Group 3: Protected Fields Modification Resistance ---');
    {
      // Attempt privilege escalation and identity hijacking
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role: 'admin',
          email: 'admin_hacked@terra360.in',
          isActive: false,
          passwordHash: 'injected_hash',
          isDeleted: true,
        }),
      });
      check('Privilege escalation request processed or filtered', res.status === 200 || res.status === 400);

      // Verify DB record to ensure protected fields were completely untouched
      const dbUser = await User.findById(userId);
      check('Role remained citizen (immune to role escalation)', dbUser?.role === 'citizen');
      check('Email remained unchanged', dbUser?.email === testEmail);
      check('isActive remained true', dbUser?.isActive === true);
      check('isDeleted remained false', dbUser?.isDeleted === false);
    }

    // ── GROUP 4: PASSWORD MANAGEMENT ──
    console.log('\n--- Group 4: Password Change Flow & Verification ---');
    {
      // 1. Wrong current password
      const wrongRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: 'WrongPassword123!',
          newPassword: updatedPassword,
          confirmPassword: updatedPassword,
        }),
      });
      const wrongJson = (await wrongRes.json()) as any;
      check('Wrong current password returns HTTP 400', wrongRes.status === 400);
      check('Error code is INVALID_CREDENTIALS', wrongJson.error?.code === 'INVALID_CREDENTIALS');

      // 2. Short new password (< 8 chars)
      const shortRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: 'short',
        }),
      });
      check('Short password rejected with HTTP 400', shortRes.status === 400);

      // 3. Mismatched confirmPassword
      const mismatchRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
          confirmPassword: 'DoesNotMatchPassword!',
        }),
      });
      check('Mismatched confirmation password rejected with HTTP 400', mismatchRes.status === 400);

      // 4. Valid password change
      const validRes = await fetch(`${BASE_URL}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          Cookie: `refreshToken=${refreshTokenCookie}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
          confirmPassword: updatedPassword,
        }),
      });
      const validJson = (await validRes.json()) as any;
      check('Valid password change returns HTTP 200', validRes.status === 200);
      check('Success message returned', validJson.data?.message?.includes('updated successfully'));

      // Verify login with old password fails
      const oldLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.52',
        },
        body: JSON.stringify({
          email: testEmail,
          password: initialPassword,
        }),
      });
      check('Login with old password now returns HTTP 401', oldLoginRes.status === 401);

      // Verify login with new password succeeds
      const newLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.53',
        },
        body: JSON.stringify({
          email: testEmail,
          password: updatedPassword,
        }),
      });
      const newLoginJson = (await newLoginRes.json()) as any;
      check('Login with newly changed password returns HTTP 200', newLoginRes.status === 200);
      accessToken = newLoginJson.data?.accessToken;
      refreshTokenCookie = extractCookie(newLoginRes.headers, 'refreshToken') || '';
    }

    // ── GROUP 5: SESSION MANAGEMENT ──
    console.log('\n--- Group 5: Active Sessions Listing & Individual Revocation ---');
    {
      // Create a second session from a simulated mobile device
      const mobileLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'X-Forwarded-For': '198.51.100.55',
        },
        body: JSON.stringify({
          email: testEmail,
          password: updatedPassword,
        }),
      });
      check('Second session created (HTTP 200)', mobileLoginRes.status === 200);

      // List sessions with current refreshToken cookie
      const sessionsRes = await fetch(`${BASE_URL}/api/v1/users/me/sessions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Cookie: `refreshToken=${refreshTokenCookie}`,
        },
      });
      const sessionsJson = (await sessionsRes.json()) as any;
      check('GET /users/me/sessions returns HTTP 200', sessionsRes.status === 200);
      check('Returns at least 2 active sessions', sessionsJson.data?.sessions?.length >= 2);

      // Verify raw hash is NOT exposed
      check(
        'Session hash is strictly hidden from client',
        sessionsJson.data?.sessions?.[0]?.hash === undefined
      );

      // Verify isCurrent identifies the current session
      const currentSession = sessionsJson.data?.sessions?.find((s: any) => s.isCurrent === true);
      check('Correctly marks isCurrent on active session', !!currentSession);

      // Revoke the other session
      const otherSession = sessionsJson.data?.sessions?.find((s: any) => s.isCurrent !== true);
      if (otherSession) {
        const revokeRes = await fetch(`${BASE_URL}/api/v1/users/me/sessions/${otherSession.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        check('Revoking non-current session returns HTTP 200', revokeRes.status === 200);

        // Verify it was removed
        const refreshedSessionsRes = await fetch(`${BASE_URL}/api/v1/users/me/sessions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const refreshedJson = (await refreshedSessionsRes.json()) as any;
        const exists = refreshedJson.data?.sessions?.some((s: any) => s.id === otherSession.id);
        check('Revoked session no longer exists in sessions list', !exists);
      }

      // Revoking non-existent session returns 404
      const bogusRevokeRes = await fetch(
        `${BASE_URL}/api/v1/users/me/sessions/000000000000000000000000`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      check('Revoking non-existent session returns HTTP 404', bogusRevokeRes.status === 404);
    }

    // ── GROUP 6: DATA EXPORT ──
    console.log('\n--- Group 6: Personal Data Export ---');
    {
      const res = await fetch(`${BASE_URL}/api/v1/users/me/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      check('GET /users/me/export returns HTTP 200', res.status === 200);
      const contentType = res.headers.get('content-type') || '';
      check('Content-Type is application/json', contentType.includes('application/json'));

      const contentDisp = res.headers.get('content-disposition') || '';
      check('Content-Disposition is attachment with filename', contentDisp.includes('attachment') && contentDisp.includes('filename='));

      const exportData = (await res.json()) as any;
      check('Exported payload contains exportedAt timestamp', !!exportData.exportedAt);
      check('Exported payload contains account profile details', exportData.account?.email === testEmail);
      check('Password hash not included in export', exportData.account?.passwordHash === undefined);
      check('Reports array included in export', Array.isArray(exportData.reports));
    }

    // ── GROUP 7: ACCOUNT DELETION ──
    console.log('\n--- Group 7: Account Deletion (with Confirmation) ---');
    {
      // 1. Wrong confirmation text
      const wrongTextRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ confirmationText: 'cancel' }),
      });
      const wrongTextJson = (await wrongTextRes.json()) as any;
      check('Wrong confirmation text returns HTTP 400', wrongTextRes.status === 400);
      check('Error code is CONFIRM_TEXT_MISMATCH', wrongTextJson.error?.code === 'CONFIRM_TEXT_MISMATCH');

      // 2. Correct confirmation text: DELETE
      const deleteRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ confirmationText: 'DELETE' }),
      });
      const deleteJson = (await deleteRes.json()) as any;
      check('DELETE /users/me with DELETE returns HTTP 200', deleteRes.status === 200);
      check('Returns deactivation message', deleteJson.data?.message?.includes('deactivated'));

      // Check cookie was cleared
      const setCookie = deleteRes.headers.get('set-cookie') || '';
      check('RefreshToken cookie cleared on account deletion', setCookie.toLowerCase().includes('refreshtoken=;') || setCookie.includes('Max-Age=0') || setCookie.includes('expires=Thu, 01 Jan 1970'));

      // 3. Verify user is soft-deleted in DB
      const deletedUser = await User.findById(userId).select('+refreshTokens');
      check('User isDeleted flag is true in database', deletedUser?.isDeleted === true);
      check('User isActive flag is false in database', deletedUser?.isActive === false);
      check('User refresh tokens revoked or cleared', (deletedUser?.refreshTokens?.length === 0 || deletedUser?.refreshTokens?.every((s: any) => s.status === 'revoked')) === true);

      // 4. Verify subsequent authenticated request with old token is rejected
      const subsequentRes = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      check('Subsequent access with deleted account returns HTTP 401', subsequentRes.status === 401);
    }
  } finally {
    // Clean up test account from DB
    await User.deleteOne({ email: testEmail });
    console.log('\n🧹 Cleaned up temporary test user from MongoDB.');
    await mongoose.disconnect();
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAccountIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
