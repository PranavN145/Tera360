import assert from 'assert';
import http from 'http';
import app from '../app';
import { fieldOfficerService } from '../modules/fieldOfficer/fieldOfficer.service';

async function runFieldOfficerApiTests() {
  console.log('\n====================================================');
  console.log('🧪 TERRA360 FIELD OFFICER API INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://localhost:${port}/api/v1/field-officer`;

  async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = (await res.json()) as any;
    return { status: res.status, data };
  }

  async function test(name: string, fn: () => Promise<void>) {
    fieldOfficerService.resetState();
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

  try {
    await test('GET /profile returns default sector officer context', async () => {
      const res = await request('/profile');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.name, 'Temsu Jamir');
      assert.ok(res.data.data.assignedArea.includes('Sector 4'));
      assert.strictEqual(res.data.data.activeDutyStatus, true);
      assert.ok(res.data.data.badgeNumber);
    });

    await test('PATCH /profile/language updates language to "hi"', async () => {
      const res = await request('/profile/language', {
        method: 'PATCH',
        body: JSON.stringify({ language: 'hi' }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.language, 'hi');
    });

    await test('PATCH /profile/language returns 400 on empty language', async () => {
      const res = await request('/profile/language', {
        method: 'PATCH',
        body: JSON.stringify({ language: '   ' }),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error?.code, 'VALIDATION_ERROR');
    });

    await test('GET /tasks retrieves assigned tasks for the sector', async () => {
      const res = await request('/tasks');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.data.length >= 2);
      const task = res.data.data[0];
      assert.ok(task.id && task.location?.coordinates && task.riskLevel && task.reason && task.deadline);
    });

    await test('PATCH /tasks/:id/start moves status to In_Progress and logs startedAt', async () => {
      const res = await request('/tasks/TSK-NH29-002/start', { method: 'PATCH' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.status, 'In_Progress');
      assert.ok(res.data.data.startedAt);
    });

    await test('PATCH /tasks/:id/complete marks task Completed with completionNotes', async () => {
      const notes = 'Anchors stabilized, surface debris cleared.';
      const res = await request('/tasks/TSK-NH29-001/complete', {
        method: 'PATCH',
        body: JSON.stringify({ completionNotes: notes }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.status, 'Completed');
      assert.strictEqual(res.data.data.completionNotes, notes);
      assert.ok(res.data.data.completedAt);
    });

    await test('POST /tasks/:id/escalate sets Escalated status and dispatches central alert', async () => {
      const reason = 'Subsidence tension crack widening by 10mm/hr. Massive slide imminent.';
      const res = await request('/tasks/TSK-NH29-001/escalate', {
        method: 'POST',
        body: JSON.stringify({ reason, priority: 'Critical' }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.task.status, 'Escalated');
      assert.strictEqual(res.data.data.dashboardDispatch?.status, 'DISPATCHED_TO_HIGH_COMMAND');
      assert.strictEqual(res.data.data.dashboardDispatch?.priority, 'Critical');
    });

    await test('POST /tasks/:id/escalate returns 400 when reason is omitted', async () => {
      const res = await request('/tasks/TSK-NH29-001/escalate', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error?.code, 'VALIDATION_ERROR');
    });

    await test('GET /map/data returns GeoJSON boundaries, danger zones, reports, and routes', async () => {
      const res = await request('/map/data');
      assert.strictEqual(res.status, 200);
      const { boundaries, dangerZones, hazardReports, navigationRoutes } = res.data.data;
      assert.strictEqual(boundaries.type, 'FeatureCollection');
      assert.ok(Array.isArray(dangerZones) && dangerZones.length > 0);
      assert.notStrictEqual(dangerZones[0].riskWeight, undefined);
      assert.ok(Array.isArray(hazardReports));
      assert.ok(Array.isArray(navigationRoutes) && navigationRoutes.length > 0);
      assert.ok(navigationRoutes[0].origin?.coordinates && navigationRoutes[0].destination?.coordinates);
    });

    await test('GET /reports retrieves citizen reports for assigned sector', async () => {
      const res = await request('/reports');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data) && res.data.data.length >= 2);
      const rep = res.data.data[0];
      assert.ok(rep.id && rep.villagerName && rep.coordinates && rep.hazardType && rep.status);
    });

    await test('PATCH /reports/:id/verify verifies report and records field notes', async () => {
      const notes = 'Ground truth confirmed; active mud deposit on hillside.';
      const photo = 'https://terra360.in/uploads/inspect.jpg';
      const res = await request('/reports/VREP-2026-104/verify', {
        method: 'PATCH',
        body: JSON.stringify({ fieldNotes: notes, inspectorPhotoUrl: photo }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.status, 'Verified');
      assert.strictEqual(res.data.data.fieldNotes, notes);
      assert.strictEqual(res.data.data.inspectorPhotoUrl, photo);
      assert.ok(res.data.data.verifiedAt);
    });

    await test('PATCH /reports/:id/reject rejects report with mandatory reason', async () => {
      const reason = 'Agricultural terrace weeding debris mistaken for slope slip.';
      const res = await request('/reports/VREP-2026-105/reject', {
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason: reason }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.status, 'Rejected');
      assert.strictEqual(res.data.data.rejectionReason, reason);
      assert.ok(res.data.data.rejectedAt);
    });

    await test('PATCH /reports/:id/reject returns 400 when rejectionReason is missing', async () => {
      const res = await request('/reports/VREP-2026-105/reject', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error?.code, 'VALIDATION_ERROR');
    });

    await test('POST /reports/:id/escalate escalates report straight to high command', async () => {
      const res = await request('/reports/VREP-2026-098/escalate', {
        method: 'POST',
        body: JSON.stringify({
          urgency: 'Critical',
          escalationReason: 'Debris flow threatening bridge foundation.',
          recommendedAction: 'Immediate deployment of excavator team.',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.report.status, 'Escalated');
      assert.strictEqual(res.data.data.report.escalationMetadata?.urgency, 'Critical');
      assert.ok(res.data.data.commandDispatch);
    });

    await test('GET /road-status/current retrieves real-time road conditions', async () => {
      const res = await request('/road-status/current');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.data) && res.data.data.length >= 2);
    });

    await test('POST /road-status/update accepts strict enum and syncs to central dashboard', async () => {
      const res = await request('/road-status/update', {
        method: 'POST',
        body: JSON.stringify({
          roadSegmentId: 'ROAD-NH29-S4',
          stretchName: 'NH-29 KM 38 to KM 52 (Phesama – Dzüdza)',
          condition: 'Blocked',
          reason: 'Total blockage from heavy mudslip at KM 43.',
          photoUrl: 'https://terra360.in/uploads/nh29-blocked.jpg',
        }),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.roadStatus.condition, 'Blocked');
      assert.strictEqual(res.data.data.dashboardSync?.broadcastType, 'ROAD_STATUS_REALTIME_UPDATE');
      assert.strictEqual(res.data.data.dashboardSync?.routeAlertsUpdated, true);
    });

    await test('POST /road-status/update rejects non-enum condition with 400', async () => {
      const res = await request('/road-status/update', {
        method: 'POST',
        body: JSON.stringify({
          roadSegmentId: 'ROAD-NH29-S4',
          condition: 'SlightlyDamaged',
          reason: 'Pebbles on shoulder',
        }),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error?.code, 'VALIDATION_ERROR');
    });

    await test('GET /alerts returns active emergency alerts for sector', async () => {
      const res = await request('/alerts');
      assert.strictEqual(res.status, 200);
      const alert = res.data.data.find((a: any) => a.id === 'ALT-SEC4-2026-01');
      assert.ok(alert && alert.severity === 'Critical' && alert.acknowledged === false);
    });

    await test('PATCH /alerts/:id/acknowledge sets acknowledged: true with officer ID and timestamp', async () => {
      const res = await request('/alerts/ALT-SEC4-2026-01/acknowledge', { method: 'PATCH' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.acknowledged, true);
      assert.ok(res.data.data.acknowledgedAt && res.data.data.acknowledgedBy);
    });

    await test('PATCH /tasks/:id/start returns 404 on missing task ID', async () => {
      const res = await request('/tasks/TSK-DOES-NOT-EXIST/start', { method: 'PATCH' });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error?.code, 'NOT_FOUND');
    });

    await test('PATCH /tasks/:id/start returns 403 when accessing resource from another sector', async () => {
      const res = await request('/tasks/TSK-NH29-001/start', {
        method: 'PATCH',
        headers: { 'x-officer-sector': 'Sector 99 - Remote Frontier' },
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error?.code, 'FORBIDDEN_SECTOR_ACCESS');
    });
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`📊 FIELD OFFICER TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFieldOfficerApiTests();

