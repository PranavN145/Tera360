/**
 * Terra360 Field Officer Portal - Unit & Logic Test Suite
 * Tests controller methods, business rules, validations, transitions, and edge cases.
 */

const {
  fieldOfficerController,
  VALID_CONDITIONS,
  VALID_TASK_RISK,
  VALID_REPORT_STATUS,
  VALID_SEVERITIES,
} = require('../controllers/fieldOfficerController');

function createMockReqRes({ params = {}, body = {}, query = {}, headers = {}, user = null } = {}) {
  const req = {
    params,
    body,
    query,
    headers,
    user,
  };

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  let nextError = null;
  const next = (err) => {
    if (err) nextError = err;
  };

  return { req, res, next, getError: () => nextError };
}

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TERRA360 FIELD OFFICER CONTROLLER UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    fieldOfficerController.resetState();
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  // 1. Profile Retrieval
  await test('GET /profile returns authenticated officer context', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getProfile(req, res, next);
    if (res.statusCode !== 200 || !res.body.success) throw new Error('Status not 200');
    if (res.body.data.name !== 'Temsu Jamir') throw new Error(`Officer name mismatch: ${res.body.data.name}`);
    if (!res.body.data.assignedArea.includes('Sector 4')) throw new Error('Sector mismatch');
    if (!res.body.data.activeDutyStatus) throw new Error('Active duty status should be true');
    if (!res.body.data.badgeNumber) throw new Error('Badge number missing');
  });

  // 2. Language Preference Update
  await test('PATCH /profile/language updates language to "hi"', async () => {
    const { req, res, next } = createMockReqRes({ body: { language: 'hi' } });
    await fieldOfficerController.updateLanguage(req, res, next);
    if (res.statusCode !== 200 || res.body.data.language !== 'hi') {
      throw new Error(`Failed to update language: ${JSON.stringify(res.body)}`);
    }
  });

  // 3. Language Update Validation Failure
  await test('PATCH /profile/language returns 400 on empty language', async () => {
    const { req, res, next, getError } = createMockReqRes({ body: { language: '   ' } });
    await fieldOfficerController.updateLanguage(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 400 || err.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${err?.statusCode}`);
    }
  });

  // 4. Fetch Tasks
  await test('GET /tasks retrieves assigned tasks for the sector', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getTasks(req, res, next);
    if (res.statusCode !== 200 || !Array.isArray(res.body.data)) throw new Error('Tasks not returned');
    if (res.body.data.length < 2) throw new Error('Expected at least 2 tasks');
    const task = res.body.data[0];
    if (!task.id || !task.location.coordinates || !task.riskLevel || !task.reason || !task.deadline) {
      throw new Error('Task schema missing required fields');
    }
  });

  // 5. Start Task Transition
  await test('PATCH /tasks/:id/start moves status to In_Progress and logs startedAt', async () => {
    const { req, res, next } = createMockReqRes({ params: { id: 'TSK-NH29-002' } });
    await fieldOfficerController.startTask(req, res, next);
    if (res.statusCode !== 200 || res.body.data.status !== 'In_Progress') {
      throw new Error(`Expected In_Progress, got ${res.body?.data?.status}`);
    }
    if (!res.body.data.startedAt) throw new Error('startedAt timestamp missing');
  });

  // 6. Complete Task Transition
  await test('PATCH /tasks/:id/complete marks task Completed with completionNotes', async () => {
    const notes = 'Anchors stabilized, surface debris cleared.';
    const { req, res, next } = createMockReqRes({
      params: { id: 'TSK-NH29-001' },
      body: { completionNotes: notes },
    });
    await fieldOfficerController.completeTask(req, res, next);
    if (res.statusCode !== 200 || res.body.data.status !== 'Completed') {
      throw new Error(`Expected Completed, got ${res.body?.data?.status}`);
    }
    if (res.body.data.completionNotes !== notes) throw new Error('Notes mismatch');
    if (!res.body.data.completedAt) throw new Error('completedAt missing');
  });

  // 7. Escalate Task Transition & Central Dashboard Dispatch
  await test('POST /tasks/:id/escalate sets Escalated status and dispatches central dashboard alert', async () => {
    const reason = 'Subsidence tension crack widening by 10mm/hr. Massive slide imminent.';
    const { req, res, next } = createMockReqRes({
      params: { id: 'TSK-NH29-001' },
      body: { reason, priority: 'Critical' },
    });
    await fieldOfficerController.escalateTask(req, res, next);
    if (res.statusCode !== 200 || res.body.data.task.status !== 'Escalated') {
      throw new Error(`Expected Escalated, got ${res.body?.data?.task?.status}`);
    }
    const dispatch = res.body.data.dashboardDispatch;
    if (!dispatch || dispatch.status !== 'DISPATCHED_TO_HIGH_COMMAND') {
      throw new Error('Dashboard dispatch missing or incomplete');
    }
    if (dispatch.priority !== 'Critical') throw new Error('Priority mismatch');
  });

  // 8. Escalate Task Validation Error
  await test('POST /tasks/:id/escalate returns 400 when reason is omitted', async () => {
    const { req, res, next, getError } = createMockReqRes({
      params: { id: 'TSK-NH29-001' },
      body: {},
    });
    await fieldOfficerController.escalateTask(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 400 || err.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${err?.statusCode}`);
    }
  });

  // 9. Map Spatial Data
  await test('GET /map/data returns GeoJSON boundaries, danger zones, reports, and routes', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getMapData(req, res, next);
    if (res.statusCode !== 200) throw new Error('Status not 200');
    const { boundaries, dangerZones, hazardReports, navigationRoutes } = res.body.data;
    if (boundaries.type !== 'FeatureCollection') throw new Error('boundaries should be GeoJSON FeatureCollection');
    if (!Array.isArray(dangerZones) || dangerZones.length === 0) throw new Error('dangerZones missing');
    if (dangerZones[0].riskWeight === undefined) throw new Error('dangerZone riskWeight missing');
    if (!Array.isArray(hazardReports)) throw new Error('hazardReports missing');
    if (!Array.isArray(navigationRoutes) || navigationRoutes.length === 0) throw new Error('navigationRoutes missing');
    if (!navigationRoutes[0].origin.coordinates || !navigationRoutes[0].destination.coordinates) {
      throw new Error('navigationRoute coordinate endpoints missing');
    }
  });

  // 10. Fetch Villager Reports
  await test('GET /reports retrieves citizen reports for assigned sector', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getReports(req, res, next);
    if (res.statusCode !== 200 || !Array.isArray(res.body.data)) throw new Error('Reports array missing');
    if (res.body.data.length < 2) throw new Error('Expected at least 2 reports');
    const rep = res.body.data[0];
    if (!rep.id || !rep.villagerName || !rep.coordinates || !rep.hazardType || !rep.status) {
      throw new Error('Report schema missing fields');
    }
  });

  // 11. Verify Villager Report
  await test('PATCH /reports/:id/verify verifies report and records field notes', async () => {
    const notes = 'Ground truth confirmed; active mud deposit on hillside.';
    const photo = 'https://terra360.in/uploads/inspect.jpg';
    const { req, res, next } = createMockReqRes({
      params: { id: 'VREP-2026-104' },
      body: { fieldNotes: notes, inspectorPhotoUrl: photo },
    });
    await fieldOfficerController.verifyReport(req, res, next);
    if (res.statusCode !== 200 || res.body.data.status !== 'Verified') {
      throw new Error(`Expected Verified, got ${res.body?.data?.status}`);
    }
    if (res.body.data.fieldNotes !== notes) throw new Error('Field notes mismatch');
    if (res.body.data.inspectorPhotoUrl !== photo) throw new Error('Inspector photo mismatch');
    if (!res.body.data.verifiedAt) throw new Error('verifiedAt missing');
  });

  // 12. Reject Villager Report with Mandatory Reason
  await test('PATCH /reports/:id/reject rejects report with mandatory reason', async () => {
    const reason = 'Agricultural terrace weeding debris mistaken for slope slip.';
    const { req, res, next } = createMockReqRes({
      params: { id: 'VREP-2026-105' },
      body: { rejectionReason: reason },
    });
    await fieldOfficerController.rejectReport(req, res, next);
    if (res.statusCode !== 200 || res.body.data.status !== 'Rejected') {
      throw new Error(`Expected Rejected, got ${res.body?.data?.status}`);
    }
    if (res.body.data.rejectionReason !== reason) throw new Error('Rejection reason mismatch');
    if (!res.body.data.rejectedAt) throw new Error('rejectedAt missing');
  });

  // 13. Reject Villager Report Validation (Reason Missing)
  await test('PATCH /reports/:id/reject returns 400 when rejectionReason is missing', async () => {
    const { req, res, next, getError } = createMockReqRes({
      params: { id: 'VREP-2026-105' },
      body: {},
    });
    await fieldOfficerController.rejectReport(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 400 || err.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${err?.statusCode}`);
    }
  });

  // 14. Escalate Villager Report
  await test('POST /reports/:id/escalate escalates report straight to high command', async () => {
    const reason = 'Debris flow threatening bridge foundation.';
    const { req, res, next } = createMockReqRes({
      params: { id: 'VREP-2026-098' },
      body: {
        urgency: 'Critical',
        escalationReason: reason,
        recommendedAction: 'Immediate deployment of excavator team.',
      },
    });
    await fieldOfficerController.escalateReport(req, res, next);
    if (res.statusCode !== 200 || res.body.data.report.status !== 'Escalated') {
      throw new Error(`Expected Escalated, got ${res.body?.data?.report?.status}`);
    }
    if (res.body.data.report.escalationMetadata.urgency !== 'Critical') {
      throw new Error('Urgency mismatch');
    }
    if (!res.body.data.commandDispatch) throw new Error('commandDispatch missing');
  });

  // 15. Real-Time Road Status
  await test('GET /road-status/current retrieves real-time road conditions', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getCurrentRoadStatus(req, res, next);
    if (res.statusCode !== 200 || !Array.isArray(res.body.data)) throw new Error('Road data missing');
    if (res.body.data.length < 2) throw new Error('Expected at least 2 road segments');
  });

  // 16. Road Status Update with Strict Enum & Dashboard Sync
  await test('POST /road-status/update accepts strict enum and syncs to central dashboard', async () => {
    const payload = {
      roadSegmentId: 'ROAD-NH29-S4',
      stretchName: 'NH-29 KM 38 to KM 52 (Phesama – Dzüdza)',
      condition: 'Blocked',
      reason: 'Total blockage from heavy mudslip at KM 43.',
      photoUrl: 'https://terra360.in/uploads/nh29-blocked.jpg',
    };
    const { req, res, next } = createMockReqRes({ body: payload });
    await fieldOfficerController.updateRoadStatus(req, res, next);
    if (res.statusCode !== 200 || res.body.data.roadStatus.condition !== 'Blocked') {
      throw new Error(`Expected Blocked, got ${res.body?.data?.roadStatus?.condition}`);
    }
    const sync = res.body.data.dashboardSync;
    if (!sync || sync.broadcastType !== 'ROAD_STATUS_REALTIME_UPDATE') {
      throw new Error('Dashboard sync payload missing');
    }
    if (!sync.routeAlertsUpdated) throw new Error('routeAlertsUpdated flag missing');
  });

  // 17. Road Status Update Rejects Non-Enum Condition
  await test('POST /road-status/update rejects non-enum condition with 400', async () => {
    const payload = {
      roadSegmentId: 'ROAD-NH29-S4',
      condition: 'SlightlyDamaged', // Invalid
      reason: 'Pebbles on shoulder',
    };
    const { req, res, next, getError } = createMockReqRes({ body: payload });
    await fieldOfficerController.updateRoadStatus(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 400 || err.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${err?.statusCode}`);
    }
  });

  // 18. Sector Alerts Retrieval
  await test('GET /alerts returns active emergency alerts for sector', async () => {
    const { req, res, next } = createMockReqRes();
    await fieldOfficerController.getAlerts(req, res, next);
    if (res.statusCode !== 200 || !Array.isArray(res.body.data)) throw new Error('Alerts missing');
    const alert = res.body.data.find((a) => a.id === 'ALT-SEC4-2026-01');
    if (!alert || alert.severity !== 'Critical' || alert.acknowledged !== false) {
      throw new Error('Alert ALT-SEC4-2026-01 unacknowledged check failed');
    }
  });

  // 19. Acknowledge Alert
  await test('PATCH /alerts/:id/acknowledge sets acknowledged: true with officer ID and UTC timestamp', async () => {
    const { req, res, next } = createMockReqRes({ params: { id: 'ALT-SEC4-2026-01' } });
    await fieldOfficerController.acknowledgeAlert(req, res, next);
    if (res.statusCode !== 200 || res.body.data.acknowledged !== true) {
      throw new Error(`Expected acknowledged=true, got ${res.body?.data?.acknowledged}`);
    }
    if (!res.body.data.acknowledgedAt) throw new Error('acknowledgedAt timestamp missing');
    if (!res.body.data.acknowledgedBy) throw new Error('acknowledgedBy officer ID missing');
  });

  // 20. 404 Not Found on Missing Task
  await test('Returns 404 on missing task ID', async () => {
    const { req, res, next, getError } = createMockReqRes({ params: { id: 'TSK-DOES-NOT-EXIST' } });
    await fieldOfficerController.startTask(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 404 || err.code !== 'NOT_FOUND') {
      throw new Error(`Expected 404 NOT_FOUND, got ${err?.statusCode}`);
    }
  });

  // 21. 403 Forbidden on Cross-Sector Access
  await test('Returns 403 when accessing resource from another sector', async () => {
    const { req, res, next, getError } = createMockReqRes({
      params: { id: 'TSK-NH29-001' },
      headers: { 'x-officer-sector': 'Sector 99 - Remote Frontier' },
    });
    await fieldOfficerController.startTask(req, res, next);
    const err = getError();
    if (!err || err.statusCode !== 403 || err.code !== 'FORBIDDEN_SECTOR_ACCESS') {
      throw new Error(`Expected 403 FORBIDDEN_SECTOR_ACCESS, got ${err?.statusCode}`);
    }
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests();
