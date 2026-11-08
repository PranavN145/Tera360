export {};

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function runContactIntegrationTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 — PHASE 3.3 CONTACT DESK INTEGRATION TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function check(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Missing Required Fields Test
  console.log('--- Test 1: Missing Required Fields Validation ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const json = (await res.json()) as any;
    check('Rejects completely empty body with HTTP 400', res.status === 400);
    check('Indicates success = false', json.success === false);
    check('Error code is VALIDATION_ERROR', json.error?.code === 'VALIDATION_ERROR');
    check('Flags missing name', Array.isArray(json.error?.fields?.name));
    check('Flags missing email', Array.isArray(json.error?.fields?.email));
    check('Flags missing state', Array.isArray(json.error?.fields?.state));
    check('Flags missing message', Array.isArray(json.error?.fields?.message));
  }

  // 2. Invalid Email Format Test
  console.log('\n--- Test 2: Invalid Email Format Rejection ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. H. L. Ralte',
        email: 'invalid-email-address',
        state: 'Mizoram',
        message: 'Inquiry regarding Doppler rainfall sensors in Aizawl.',
      }),
    });

    const json = (await res.json()) as any;
    check('Rejects invalid email with HTTP 400', res.status === 400);
    check(
      'Email field error specifies invalid email',
      json.error?.fields?.email?.[0]?.toLowerCase().includes('email')
    );
  }

  // 3. Short Message (< 5 characters) Test
  console.log('\n--- Test 3: Short Message Rejection ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. H. L. Ralte',
        email: 'ralte@mizoram.gov.in',
        state: 'Mizoram',
        message: 'Hi', // 2 chars, min is 5
      }),
    });

    const json = (await res.json()) as any;
    check('Rejects message shorter than 5 chars with HTTP 400', res.status === 400);
    check('Flags message length violation', Array.isArray(json.error?.fields?.message));
  }

  // 4. Successful Contact Submission (Happy Path)
  console.log('\n--- Test 4: Successful Contact Submission ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.99', // Unique test IP to respect rate limiter
      },
      body: JSON.stringify({
        name: 'T. Jamir',
        email: 'T.Jamir@NAGALAND.GOV.IN', // Test normalization
        state: 'Nagaland',
        phone: '+91 98765 00000',
        message: 'Requesting webhook telemetry feed for NH-29 Kohima–Dimapur corridor monitoring.',
        // Attempt mass-assignment attack:
        status: 'archived',
        staffNotes: 'internal only',
      }),
    });

    const json = (await res.json()) as any;
    check('Returns HTTP 201 Created on valid submission', res.status === 201);
    check('Response indicates success = true', json.success === true);
    check(
      'Returns confirmation message',
      typeof json.message === 'string' && json.message.includes('received')
    );
    check('Returns generated contact id', typeof json.data?.id === 'string');
    check('Matches submitted name', json.data?.name === 'T. Jamir');
    check(
      'Normalizes email to lowercase',
      json.data?.email === 't.jamir@nagaland.gov.in'
    );
    check('Matches submitted state', json.data?.state === 'Nagaland');
    check('Matches submitted phone', json.data?.phone === '+91 98765 00000');
    check(
      'Enforces status = new (immune to client tampering)',
      json.data?.status === 'new'
    );
    check('Does not expose internal staff notes', json.data?.staffNotes === undefined);
  }

  // 5. Rate Limiting Enforcement (Exceeding 10 per 15 mins)
  console.log('\n--- Test 5: Rate Limiting Enforcement (10 per 15 min window) ---');
  {
    const spamIP = '198.51.100.150';
    let blockedWith429 = false;

    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${BASE_URL}/api/v1/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': spamIP,
        },
        body: JSON.stringify({
          name: `Rate Test ${i}`,
          email: `ratetest${i}@example.com`,
          state: 'Assam',
          message: 'Testing rate limit threshold enforcement.',
        }),
      });

      if (res.status === 429) {
        blockedWith429 = true;
        const json = (await res.json()) as any;
        check('Returns HTTP 429 when quota exceeded', true);
        check(
          'Error code is TOO_MANY_REQUESTS',
          json.error?.code === 'TOO_MANY_REQUESTS'
        );
        break;
      }
    }

    check('Rate limiter effectively blocks excessive submissions', blockedWith429);
  }

  console.log('\n========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runContactIntegrationTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});

