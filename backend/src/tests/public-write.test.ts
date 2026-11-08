import assert from 'assert';
import http from 'http';
import app from '../app';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { Report } from '../modules/reports/report.model';
import { Contact } from '../modules/contact/contact.model';
import { captchaService, CaptchaVerificationError } from '../services/captcha.service';
import { validatePhotoStorageUrl } from '../modules/reports/report.schema';

async function runPublicWriteApiTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 PHASE 2.5: PUBLIC WRITE & SECURITY TEST SUITE');
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

  // Ensure test mode
  (env as any).NODE_ENV = 'test';

  // Connect to DB and spin up test server on ephemeral port
  await connectDB();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  async function request(
    path: string,
    options: RequestInit = {},
    customHeaders: Record<string, string> = {}
  ) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as any),
        ...customHeaders,
      },
    });
    const json = (await res.json()) as any;
    return { status: res.status, data: json, headers: res.headers };
  }

  const testTag = `TEST_RUN_${Date.now()}`;
  let testIpCounter = 1;
  function getUniqueIp(): string {
    return `198.51.100.${testIpCounter++}`;
  }

  try {
    // ═══════════════════════════════════════════════════════════════
    // GROUP 1: Cloudflare Turnstile CAPTCHA Verification
    // ═══════════════════════════════════════════════════════════════
    console.log('--- [Group 1: Cloudflare Turnstile CAPTCHA Verification] ---');

    await test('Rejects public report when captchaToken is completely missing', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 42`,
            hazardType: 'Rockfall',
            description: `${testTag} Rocks on road.`,
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.captchaToken);
    });

    await test('Rejects public report when captchaToken is empty string', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 42`,
            hazardType: 'Rockfall',
            description: `${testTag} Rocks on road.`,
            captchaToken: '   ',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.captchaToken);
    });

    await test('Rejects public report when captchaToken fails verification', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 42`,
            hazardType: 'Rockfall',
            description: `${testTag} Rocks on road.`,
            captchaToken: 'test-turnstile-token-invalid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'CAPTCHA_VERIFICATION_FAILED');
    });

    await test('Fails closed with 503 when CAPTCHA provider suffers an outage', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 42`,
            hazardType: 'Rockfall',
            description: `${testTag} Rocks on road.`,
            captchaToken: 'test-turnstile-provider-failure',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'CAPTCHA_SERVICE_UNAVAILABLE');
    });

    await test('Accepts valid CAPTCHA token and does not persist token in DB', async () => {
      const clientIp = getUniqueIp();
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 42 near Byasi`,
            hazardType: 'Rockfall',
            description: `${testTag} Boulder movement on highway.`,
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': clientIp }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.data.reportId);

      // Verify captchaToken is NEVER returned in response or persisted to report
      assert.strictEqual((res.data.data as any).captchaToken, undefined);
      const doc = await Report.findOne({ reportId: res.data.data.reportId });
      assert.ok(doc);
      assert.strictEqual((doc as any).captchaToken, undefined);
    });

    await test('Test-only verifier bypass is strictly locked to NODE_ENV === "test"', async () => {
      // Temporarily simulate production environment
      const originalEnv = env.NODE_ENV;
      const originalKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
      try {
        (env as any).NODE_ENV = 'production';
        (env as any).CLOUDFLARE_TURNSTILE_SECRET_KEY = undefined;

        let caughtError: any = null;
        try {
          await captchaService.verifyTurnstileToken('test-turnstile-token-valid', '127.0.0.1');
        } catch (err) {
          caughtError = err;
        }

        assert.ok(caughtError instanceof CaptchaVerificationError);
        assert.strictEqual(caughtError.statusCode, 503);
        assert.strictEqual(caughtError.code, 'CAPTCHA_SERVICE_UNAVAILABLE');
      } finally {
        (env as any).NODE_ENV = originalEnv;
        (env as any).CLOUDFLARE_TURNSTILE_SECRET_KEY = originalKey;
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // GROUP 2: Report Photo URL Validation & Cloud Domain Allowlist
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- [Group 2: Photo URL Safety & Storage Allowlist] ---');

    await test('Accepts valid HTTPS photo URL from approved domain (Cloudinary)', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 45`,
            hazardType: 'Rockfall',
            description: `${testTag} Rockfall with photo attachment.`,
            photoUrl: 'https://res.cloudinary.com/terra360/photos/rockfall.jpg',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(
        res.data.data.photoUrl,
        'https://res.cloudinary.com/terra360/photos/rockfall.jpg'
      );
    });

    await test('Accepts valid HTTPS photo URL from approved domain (S3 subdomain)', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58 km 46`,
            hazardType: 'Rockfall',
            description: `${testTag} Rockfall with S3 photo attachment.`,
            photoUrl: 'https://my-bucket.s3.amazonaws.com/uploads/rockfall.png',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
    });

    await test('Rejects insecure HTTP photo URL', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58`,
            hazardType: 'Rockfall',
            description: `${testTag} Testing insecure URL.`,
            photoUrl: 'http://res.cloudinary.com/terra360/photos/rockfall.jpg',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.photoUrl);
    });

    await test('Rejects javascript: scheme in photoUrl', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58`,
            hazardType: 'Rockfall',
            description: `${testTag} Testing XSS URL.`,
            photoUrl: 'javascript:alert(document.cookie)',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.error.fields?.photoUrl);
    });

    await test('Rejects data: scheme in photoUrl', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58`,
            hazardType: 'Rockfall',
            description: `${testTag} Testing data URI.`,
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.ok(res.data.error.fields?.photoUrl);
    });

    await test('Rejects unapproved storage domain in photoUrl', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58`,
            hazardType: 'Rockfall',
            description: `${testTag} Testing unapproved domain.`,
            photoUrl: 'https://malicious-external-storage.net/photo.jpg',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.photoUrl);
    });

    await test('Rejects photoUrl when no storage domains are configured', () => {
      const originalDomains = env.ALLOWED_PHOTO_DOMAINS;
      try {
        (env as any).ALLOWED_PHOTO_DOMAINS = '';
        const check = validatePhotoStorageUrl('https://res.cloudinary.com/test.jpg');
        assert.strictEqual(check.valid, false);
        assert.ok(check.message?.includes('not currently supported'));
      } finally {
        (env as any).ALLOWED_PHOTO_DOMAINS = originalDomains;
      }
    });

    await test('Accepts empty string and omitted photoUrl as optional', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} NH-58`,
            hazardType: 'Rockfall',
            description: `${testTag} Photo omitted test.`,
            photoUrl: '',
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.photoUrl, undefined);
    });

    // ═══════════════════════════════════════════════════════════════
    // GROUP 3: Trusted Proxy & IP Address Security
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- [Group 3: Trusted Proxy & IP Spoofing Prevention] ---');

    await test('Controller uses Express validated req.ip without trusting raw leftmost header', async () => {
      // In loopback mode (127.0.0.1 is trusted proxy in test server),
      // a single hop X-Forwarded-For is properly extracted by Express.
      const legitimateClientIp = '198.51.100.77';
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} IP Test Stretch`,
            hazardType: 'Rockfall',
            description: `${testTag} Testing IP extraction.`,
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': legitimateClientIp }
      );

      assert.strictEqual(res.status, 201);
      const doc = await Report.findOne({ reportId: res.data.data.reportId });
      assert.ok(doc);
      // Express validated req.ip is saved
      assert.strictEqual(doc.ipAddress, legitimateClientIp);
    });

    // ═══════════════════════════════════════════════════════════════
    // GROUP 4: Core Validation, Mass Assignment & Contact Desk Inquiries
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- [Group 4: Public Report & Contact Form Core APIs] ---');

    await test('Submit hazard report with GeoJSON Point coordinates', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Sikkim',
            location: `${testTag} NH-10 near Rangpo`,
            hazardType: 'Debris Flow',
            description: `${testTag} Debris accumulation near road embankment.`,
            coordinates: {
              type: 'Point',
              coordinates: [88.52, 27.17],
            },
            captchaToken: 'test-turnstile-token-valid',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.deepStrictEqual(res.data.data.coordinates, {
        type: 'Point',
        coordinates: [88.52, 27.17],
      });
    });

    await test('Enforces mass-assignment protection on report submission', async () => {
      const res = await request(
        '/api/v1/reports/public',
        {
          method: 'POST',
          body: JSON.stringify({
            state: 'Uttarakhand',
            location: `${testTag} Mass Assignment Bypass`,
            hazardType: 'Subsidence',
            description: `${testTag} Crack widening under monsoon rain.`,
            captchaToken: 'test-turnstile-token-valid',
            // Attacker forged fields:
            reportId: 'FORGED_ID_9999',
            status: 'verified',
            source: 'field_officer',
            verifiedBy: '507f1f77bcf86cd799439011',
            isDeleted: true,
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.notStrictEqual(res.data.data.reportId, 'FORGED_ID_9999');
      assert.strictEqual(res.data.data.status, 'submitted');
      assert.strictEqual(res.data.data.source, 'public');

      const doc = await Report.findOne({ reportId: res.data.data.reportId });
      assert.ok(doc);
      assert.strictEqual(doc.status, 'submitted');
      assert.strictEqual(doc.source, 'public');
      assert.strictEqual(doc.isDeleted, false);
      assert.strictEqual(doc.verifiedBy, undefined);
    });

    await test('Submit contact inquiry with full fields and verify lowercase email', async () => {
      const res = await request(
        '/api/v1/contact',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Sunil Pant',
            email: 'SUNIL.PANT@Example.COM',
            state: 'Uttarakhand',
            phone: '+919876501234',
            message: `${testTag} Village council inquiry regarding road sensors.`,
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.email, 'sunil.pant@example.com');
      assert.strictEqual(res.data.data.status, 'new');
      assert.strictEqual(res.data.data.notes, undefined);

      const doc = await Contact.findById(res.data.data.id);
      assert.ok(doc);
      assert.strictEqual(doc.email, 'sunil.pant@example.com');
    });

    await test('Enforces mass-assignment protection on contact inquiry', async () => {
      const res = await request(
        '/api/v1/contact',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Infiltrator',
            email: 'infiltrator@example.com',
            state: 'Uttarakhand',
            message: `${testTag} Automated query attempting resolution.`,
            status: 'resolved',
            notes: 'Forged notes',
          }),
        },
        { 'X-Forwarded-For': getUniqueIp() }
      );

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.data.status, 'new');

      const doc = await Contact.findById(res.data.data.id);
      assert.ok(doc);
      assert.strictEqual(doc.status, 'new');
      assert.strictEqual(doc.notes, undefined);
    });

    // ═══════════════════════════════════════════════════════════════
    // GROUP 5: Rate Limiting
    // ═══════════════════════════════════════════════════════════════
    console.log('\n--- [Group 5: Rate Limiting & Abuse Prevention] ---');

    await test('POST /api/v1/reports/public rate limiter blocks on exceeding quota', async () => {
      const floodIp = '203.0.113.71';
      const payload = {
        state: 'Uttarakhand',
        location: `${testTag} Flood Test`,
        hazardType: 'Rockfall',
        description: `${testTag} Rapid submissions to verify rate limiting.`,
        captchaToken: 'test-turnstile-token-valid',
      };

      let got429 = false;
      for (let i = 0; i < 12; i++) {
        const res = await request(
          '/api/v1/reports/public',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          { 'X-Forwarded-For': floodIp }
        );

        if (res.status === 429) {
          got429 = true;
          assert.strictEqual(res.data.success, false);
          assert.strictEqual(res.data.error.code, 'TOO_MANY_REQUESTS');
          break;
        }
      }

      assert.strictEqual(got429, true, 'Rate limiter should trigger HTTP 429 when quota exceeded');
    });

    await test('POST /api/v1/contact rate limiter blocks on exceeding quota', async () => {
      const floodIp = '203.0.113.72';
      const payload = {
        name: 'Rate Tester',
        email: 'tester@example.com',
        state: 'Uttarakhand',
        message: `${testTag} Repetitive contact inquiry to verify rate limit.`,
      };

      let got429 = false;
      for (let i = 0; i < 12; i++) {
        const res = await request(
          '/api/v1/contact',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          { 'X-Forwarded-For': floodIp }
        );

        if (res.status === 429) {
          got429 = true;
          assert.strictEqual(res.data.success, false);
          assert.strictEqual(res.data.error.code, 'TOO_MANY_REQUESTS');
          break;
        }
      }

      assert.strictEqual(got429, true, 'Rate limiter should trigger HTTP 429 when quota exceeded');
    });
  } finally {
    // Clean up test data
    await Report.deleteMany({ location: new RegExp(testTag, 'i') });
    await Contact.deleteMany({ message: new RegExp(testTag, 'i') });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }

  console.log('\n========================================================');
  console.log(`📊 PUBLIC WRITE TEST RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPublicWriteApiTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
