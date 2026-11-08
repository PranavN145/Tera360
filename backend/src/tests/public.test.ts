import assert from 'assert';
import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { Alert } from '../modules/alerts/alert.model';
import { Road } from '../modules/roads/road.model';
import { Report } from '../modules/reports/report.model';

async function runPublicApiTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 PHASE 2.2: PUBLIC READ APIS TEST SUITE');
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

  // Connect to DB and spin up test server on ephemeral port
  await connectDB();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as any),
      },
    });
    const json = (await res.json()) as any;
    return { status: res.status, data: json, headers: res.headers };
  }

  // Clean test-specific records before tests
  const testTag = `TEST_RUN_${Date.now()}`;
  await Alert.deleteMany({ title: new RegExp(testTag, 'i') });
  await Road.deleteMany({ code: new RegExp(testTag, 'i') });
  await Report.deleteMany({ reportId: new RegExp(testTag, 'i') });

  try {
    // ── 1. GET /api/v1/public/stats (Initial/Baseline) ──
    console.log('--- [Group 1: Public Stats Endpoint] ---');

    await test('GET /api/v1/public/stats returns 200 and standard stats structure', async () => {
      const res = await request('/api/v1/public/stats');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(typeof res.data.data.publishedAlerts === 'number');
      assert.ok(typeof res.data.data.criticalAlerts === 'number');
      assert.ok(typeof res.data.data.blockedRoads === 'number');
      assert.ok(typeof res.data.data.roadsUnderCaution === 'number');
      assert.ok(typeof res.data.data.openRoads === 'number');
      assert.ok(typeof res.data.data.totalMonitoredCorridors === 'number');
      assert.ok(typeof res.data.data.communityReportsSubmitted === 'number');
      assert.ok(typeof res.data.data.lastUpdated === 'string');
    });

    // ── Seed specific test records for precision testing ──
    await Road.create([
      {
        name: `Open Highway (${testTag})`,
        code: `${testTag}_NH1`,
        state: 'Nagaland',
        stretch: 'Mile 10',
        status: 'open',
        riskLevel: 'Low',
        isMajorNH: true,
        isDeleted: false,
      },
      {
        name: `Blocked Highway (${testTag})`,
        code: `${testTag}_NH2`,
        state: 'Assam',
        stretch: 'Mile 20',
        status: 'blocked',
        riskLevel: 'Critical',
        statusReason: 'Debris slide',
        isMajorNH: true,
        isDeleted: false,
      },
      {
        name: `Deleted Highway (${testTag})`,
        code: `${testTag}_DEL`,
        state: 'Nagaland',
        stretch: 'Mile 30',
        status: 'blocked',
        riskLevel: 'Critical',
        isMajorNH: true,
        isDeleted: true,
      },
    ]);

    await Alert.create([
      {
        title: `Critical Alert (${testTag})`,
        severity: 'Critical',
        state: 'Nagaland',
        corridor: `${testTag}_NH1`,
        description: 'Severe active slide near Mile 10.',
        advisory: 'Do not travel.',
        status: 'published',
        publishedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
        isDeleted: false,
      },
      {
        title: `Watch Alert (${testTag})`,
        severity: 'Watch',
        state: 'Assam',
        corridor: `${testTag}_NH2`,
        description: 'Rainfall increasing.',
        advisory: 'Proceed with caution.',
        status: 'published',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hr ago
        isDeleted: false,
      },
      {
        title: `Draft Alert (${testTag})`,
        severity: 'Critical',
        state: 'Nagaland',
        corridor: `${testTag}_NH1`,
        description: 'Internal draft not yet approved.',
        advisory: 'Internal.',
        status: 'draft',
        isDeleted: false,
      },
      {
        title: `Deleted Alert (${testTag})`,
        severity: 'Critical',
        state: 'Nagaland',
        corridor: `${testTag}_NH1`,
        description: 'Soft deleted.',
        advisory: 'None.',
        status: 'published',
        isDeleted: true,
      },
    ]);

    // ── 2. GET /api/v1/public/risk-map ──
    console.log('\n--- [Group 2: Public Risk Map Endpoint] ---');

    await test('GET /api/v1/public/risk-map returns 200 with active corridors', async () => {
      const res = await request('/api/v1/public/risk-map');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));

      const foundOpen = res.data.data.find((r: any) => r.code === `${testTag}_NH1`);
      const foundBlocked = res.data.data.find((r: any) => r.code === `${testTag}_NH2`);
      const foundDeleted = res.data.data.find((r: any) => r.code === `${testTag}_DEL`);

      assert.ok(foundOpen, 'Active open road should be returned');
      assert.ok(foundBlocked, 'Active blocked road should be returned');
      assert.strictEqual(foundDeleted, undefined, 'Soft-deleted road must not be returned');
    });

    await test('GET /api/v1/public/risk-map filters by state', async () => {
      const res = await request('/api/v1/public/risk-map?state=Nagaland');
      assert.strictEqual(res.status, 200);
      const items = res.data.data.filter((r: any) => r.code.startsWith(testTag));
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].code, `${testTag}_NH1`);
    });

    await test('GET /api/v1/public/risk-map never exposes internal fields', async () => {
      const res = await request('/api/v1/public/risk-map');
      for (const item of res.data.data) {
        assert.strictEqual(item.isDeleted, undefined);
        assert.strictEqual(item.deletedAt, undefined);
        assert.strictEqual(item.__v, undefined);
      }
    });

    // ── 3. GET /api/v1/public/alerts ──
    console.log('\n--- [Group 3: Public Alerts Endpoint] ---');

    await test('GET /api/v1/public/alerts returns only published and non-deleted alerts', async () => {
      const res = await request('/api/v1/public/alerts');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.pagination);

      const testAlerts = res.data.data.filter((a: any) => a.corridor.startsWith(testTag));
      assert.strictEqual(testAlerts.length, 2, 'Only the 2 published, non-deleted alerts should be returned');

      const titles = testAlerts.map((a: any) => a.title);
      assert.ok(titles.includes(`Critical Alert (${testTag})`));
      assert.ok(titles.includes(`Watch Alert (${testTag})`));
      assert.ok(!titles.includes(`Draft Alert (${testTag})`), 'Draft alert must not be exposed');
      assert.ok(!titles.includes(`Deleted Alert (${testTag})`), 'Deleted alert must not be exposed');
    });

    await test('GET /api/v1/public/alerts sorts newest published first', async () => {
      const res = await request('/api/v1/public/alerts');
      const testAlerts = res.data.data.filter((a: any) => a.corridor.startsWith(testTag));
      assert.strictEqual(testAlerts[0].title, `Critical Alert (${testTag})`);
      assert.strictEqual(testAlerts[1].title, `Watch Alert (${testTag})`);
    });

    await test('GET /api/v1/public/alerts filters by severity', async () => {
      const res = await request('/api/v1/public/alerts?severity=Critical');
      assert.strictEqual(res.status, 200);
      const testAlerts = res.data.data.filter((a: any) => a.corridor.startsWith(testTag));
      assert.strictEqual(testAlerts.length, 1);
      assert.strictEqual(testAlerts[0].severity, 'Critical');
    });

    await test('GET /api/v1/public/alerts filters by state', async () => {
      const res = await request('/api/v1/public/alerts?state=Assam');
      assert.strictEqual(res.status, 200);
      const testAlerts = res.data.data.filter((a: any) => a.corridor.startsWith(testTag));
      assert.strictEqual(testAlerts.length, 1);
      assert.strictEqual(testAlerts[0].state, 'Assam');
    });

    await test('GET /api/v1/public/alerts rejects invalid severity with 400 VALIDATION_ERROR', async () => {
      const res = await request('/api/v1/public/alerts?severity=InvalidTier');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.severity);
    });

    await test('GET /api/v1/public/alerts never exposes createdBy, isDeleted, or __v', async () => {
      const res = await request('/api/v1/public/alerts');
      for (const alert of res.data.data) {
        assert.strictEqual(alert.createdBy, undefined);
        assert.strictEqual(alert.isDeleted, undefined);
        assert.strictEqual(alert.deletedAt, undefined);
        assert.strictEqual(alert.__v, undefined);
      }
    });

    // ── 4. GET /api/v1/public/road-status ──
    console.log('\n--- [Group 4: Public Road Status Endpoint] ---');

    await test('GET /api/v1/public/road-status returns active roads with status and riskLevel', async () => {
      const res = await request('/api/v1/public/road-status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.data));

      const foundBlocked = res.data.data.find((r: any) => r.code === `${testTag}_NH2`);
      assert.ok(foundBlocked);
      assert.strictEqual(foundBlocked.status, 'blocked');
      assert.strictEqual(foundBlocked.riskLevel, 'Critical');
      assert.ok(foundBlocked.lastUpdated);
    });

    await test('GET /api/v1/public/road-status filters by status and state', async () => {
      const res = await request(`/api/v1/public/road-status?status=blocked&state=Assam`);
      assert.strictEqual(res.status, 200);
      const testRoads = res.data.data.filter((r: any) => r.code.startsWith(testTag));
      assert.strictEqual(testRoads.length, 1);
      assert.strictEqual(testRoads[0].code, `${testTag}_NH2`);
    });

    await test('GET /api/v1/public/road-status rejects invalid status with 400 VALIDATION_ERROR', async () => {
      const res = await request('/api/v1/public/road-status?status=destroyed');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.error.code, 'VALIDATION_ERROR');
      assert.ok(res.data.error.fields?.status);
    });

    // ── 5. Empty database scenario verification ──
    console.log('\n--- [Group 5: Empty Filter Scenarios] ---');

    await test('GET /api/v1/public/alerts returns empty array for non-existent state', async () => {
      const res = await request('/api/v1/public/alerts?state=NonExistentStateXYZ');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.length, 0);
      assert.strictEqual(res.data.pagination.total, 0);
    });

    await test('GET /api/v1/public/road-status returns empty array for non-existent state', async () => {
      const res = await request('/api/v1/public/road-status?state=NonExistentStateXYZ');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.length, 0);
    });
  } finally {
    // Clean up test documents
    await Alert.deleteMany({ title: new RegExp(testTag, 'i') });
    await Road.deleteMany({ code: new RegExp(testTag, 'i') });
    await Report.deleteMany({ reportId: new RegExp(testTag, 'i') });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }

  console.log('\n========================================================');
  console.log(`📊 PUBLIC APIS TEST RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runPublicApiTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
