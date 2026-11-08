// Integration test for hazard reporting API
export {};

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function runReportIntegrationTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 — PHASE 3.2 HAZARD REPORTING INTEGRATION TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper for reporting
  function check(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Missing CAPTCHA Token Test
  console.log('--- Test 1: Submission Without CAPTCHA Token (Deferred in Phase 3.2) ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/reports/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Nagaland',
        location: 'NH-29 Chumukedima Mile 38',
        hazardType: 'Active Debris Slide',
        description: 'Large boulder fall and continuous mudflow across northbound lane.',
        severity: 'Critical',
      }),
    });

    const json = (await res.json()) as any;
    check('Rejects missing captchaToken with HTTP 400', res.status === 400);
    check('Response indicates success = false', json.success === false);
    check(
      'Returns VALIDATION_ERROR or CAPTCHA field error',
      json.error?.code === 'VALIDATION_ERROR' && Array.isArray(json.error?.fields?.captchaToken)
    );
    check(
      'Field error indicates missing or invalid captchaToken',
      typeof json.error?.fields?.captchaToken?.[0] === 'string'
    );
  }

  // 2. Field Validation Tests (< 5 chars description, empty location)
  console.log('\n--- Test 2: Field-Level Validation Rules ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/reports/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Assam',
        location: 'A', // too short (< 2)
        hazardType: 'Rockfall',
        description: 'Tiny', // too short (< 5)
        captchaToken: '1x0000000000000000000000000000000AA',
      }),
    });

    const json = (await res.json()) as any;
    check('Rejects invalid field lengths with HTTP 400', res.status === 400);
    check('Identifies location field error', Array.isArray(json.error?.fields?.location));
    check('Identifies description field error', Array.isArray(json.error?.fields?.description));
  }

  // 3. Local File Path / Unsafe Scheme in photoUrl Rejection
  console.log('\n--- Test 3: Unsafe Photo URL Scheme Rejection ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/reports/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Nagaland',
        location: 'NH-29 Chumukedima Bypass',
        hazardType: 'Tension Cracks on Slope',
        description: 'Longitudinal cracks developing on highway asphalt.',
        severity: 'Warning',
        photoUrl: 'file:///C:/Users/Administrator/photo.jpg',
        captchaToken: '1x0000000000000000000000000000000AA',
      }),
    });

    const json = (await res.json()) as any;
    check('Rejects local file:/// photoUrl with HTTP 400', res.status === 400);
    check(
      'Error identifies unsafe photo URL',
      json.error?.fields?.photoUrl?.[0]?.includes('Unsafe') ||
        json.error?.fields?.photoUrl?.[0]?.includes('valid')
    );
  }

  // 4. Successful Report Submission with Valid Token (Happy Path)
  console.log('\n--- Test 4: Successful Report Submission with Real Turnstile Token ---');
  let generatedReportId = '';
  {
    const res = await fetch(`${BASE_URL}/api/v1/reports/public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.88', // Unique test IP to respect rate limiter
      },
      body: JSON.stringify({
        state: 'Nagaland',
        location: 'NH-29 KM 38 Chumukedima',
        hazardType: 'Active Debris Slide',
        severity: 'Critical',
        description: 'Massive landslide blocking both carriage lanes. Earth-moving equipment needed.',
        reporterName: 'Kevi Sekhose',
        reporterPhone: '+91 98765 43210',
        captchaToken: '1x0000000000000000000000000000000AA',
        // Attempt mass-assignment injection:
        status: 'verified',
        source: 'satellite',
      }),
    });

    const json = (await res.json()) as any;
    check('Returns HTTP 201 Created on valid submission', res.status === 201);
    check('Response success = true', json.success === true);
    check(
      'Generates unique reportId with TR- prefix',
      typeof json.data?.reportId === 'string' && json.data.reportId.startsWith('TR-')
    );
    generatedReportId = json.data?.reportId;
    void generatedReportId;

    check(
      'Server strictly enforces status = submitted (immune to client tampering)',
      json.data?.status === 'submitted'
    );
    check(
      'Server strictly enforces source = public (immune to client tampering)',
      json.data?.source === 'public'
    );
    check('Matches submitted state', json.data?.state === 'Nagaland');
    check('Matches submitted location', json.data?.location === 'NH-29 KM 38 Chumukedima');
    check('Matches submitted severity', json.data?.severity === 'Critical');
    check('Matches submitted reporterName', json.data?.reporterName === 'Kevi Sekhose');
  }

  // 5. Verify Database Stats Increment
  console.log('\n--- Test 5: Verified Community Reports Counter Increment ---');
  {
    const res = await fetch(`${BASE_URL}/api/v1/public/stats`);
    const json = (await res.json()) as any;
    check('Stats endpoint returns 200', res.status === 200);
    check(
      'communityReportsSubmitted is greater than 0',
      typeof json.data?.communityReportsSubmitted === 'number' &&
        json.data.communityReportsSubmitted >= 1
    );
  }

  console.log('\n========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReportIntegrationTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
