/**
 * Terra360 Backend Runtime Verification Suite
 * Tests all 14 Field Officer endpoints through backend/server.js HTTP pipeline.
 */

const { PassThrough } = require('stream');
const server = require('../server');

function injectRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = new PassThrough();
    req.method = method;
    req.url = path;
    req.headers = {
      'content-type': 'application/json',
      host: 'localhost:5000',
    };

    const res = new PassThrough();
    let resData = '';
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.writeHead = (code, headers = {}) => {
      res.statusCode = code;
      Object.assign(res.headers, headers);
    };

    res.on('data', (chunk) => { resData += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(resData);
        resolve({ status: res.statusCode, data: json });
      } catch (e) {
        resolve({ status: res.statusCode, raw: resData });
      }
    });

    server.emit('request', req, res);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('===============================================================');
  console.log('🚀 STARTING TERRA360 FIELD OFFICER BACKEND RUNTIME VERIFICATION');
  console.log('📡 Testing full HTTP pipeline against backend/server.js...');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertRoute(name, testFn) {
    try {
      await testFn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Probe
  await assertRoute('GET /health (Server Health & Readiness Check)', async () => {
    const res = await injectRequest('GET', '/health');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
  });

  // 2. Profile
  await assertRoute('GET /api/field-officer/profile (Validates officer metadata)', async () => {
    const res = await injectRequest('GET', '/api/field-officer/profile');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    const d = res.data.data;
    if (!d.name || !d.department || !d.assignedArea || !d.phone) {
      throw new Error(`Incomplete officer profile: ${JSON.stringify(d)}`);
    }
    console.log(`       -> Officer: ${d.name} | Dept: ${d.department} | Area: ${d.assignedArea}`);
  });

  // 3. Language Update
  await assertRoute('PATCH /api/field-officer/profile/language (Updates to HI/MR)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/profile/language', { language: 'HI' });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (res.data.data.language !== 'HI') throw new Error(`Expected HI, got ${res.data.data.language}`);
    console.log(`       -> Language preference updated: ${res.data.data.language}`);
  });

  // 4. Tasks Retrieval
  await assertRoute('GET /api/field-officer/tasks (Retrieves assigned sector tasks)', async () => {
    const res = await injectRequest('GET', '/api/field-officer/tasks');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.data) || res.data.data.length === 0) throw new Error('No tasks returned');
    console.log(`       -> Found ${res.data.data.length} assigned tasks. Sample ID: ${res.data.data[0].id}`);
  });

  // 5. Start Task
  await assertRoute('PATCH /api/field-officer/tasks/:id/start (Transitions to In_Progress)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/tasks/TSK-401/start');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (res.data.data.status !== 'In_Progress') throw new Error(`Expected In_Progress, got ${res.data.data.status}`);
    console.log(`       -> Task TSK-401 status: ${res.data.data.status} at ${res.data.data.startedAt}`);
  });

  // 6. Complete Task
  await assertRoute('PATCH /api/field-officer/tasks/:id/complete (Saves completion notes & syncs)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/tasks/TSK-401/complete', {
      notes: 'Slope reinforcement wire-mesh inspection completed. Retaining wall stable.',
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (res.data.data.status !== 'Completed') throw new Error(`Expected Completed, got ${res.data.data.status}`);
    console.log(`       -> Task TSK-401 completedAt: ${res.data.data.completedAt}`);
  });

  // 7. Escalate Task
  await assertRoute('POST /api/field-officer/tasks/:id/escalate (Escalates with priority & reason)', async () => {
    const res = await injectRequest('POST', '/api/field-officer/tasks/TSK-403/escalate', {
      reason: 'Culvert subsidence expanding under traffic weight. Immediate road closure required.',
      priority: 'Critical',
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    console.log(`       -> Task TSK-403 escalated to central dashboard successfully.`);
  });

  // 8. Map Data
  await assertRoute('GET /api/field-officer/map/data (Spatial payload with villages, roads, danger zones)', async () => {
    const res = await injectRequest('GET', '/api/field-officer/map/data');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    const d = res.data.data;
    if (!d.sector) throw new Error('Missing sector in map data');
    console.log(`       -> Sector: ${d.sector} | GeoJSON elements loaded.`);
  });

  // 9. Citizen Reports
  await assertRoute('GET /api/field-officer/reports (Retrieves citizen reports in sector)', async () => {
    const res = await injectRequest('GET', '/api/field-officer/reports');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Reports array missing');
    console.log(`       -> Retrieved ${res.data.data.length} reports in sector.`);
  });

  // 10. Verify Citizen Report
  await assertRoute('PATCH /api/field-officer/reports/:id/verify (Verifies ground truth)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/reports/REP-1082/verify', {
      fieldNotes: 'Inspected Shivalik bend. Loose boulders confirmed on slope.',
      inspectorPhotoUrl: 'https://images.terra360.org/inspector/verified_1082.jpg',
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (res.data.data.status !== 'Verified') throw new Error(`Expected Verified, got ${res.data.data.status}`);
    console.log(`       -> Report REP-1082 verified on site by officer.`);
  });

  // 11. Reject Citizen Report
  await assertRoute('PATCH /api/field-officer/reports/:id/reject (Rejects with mandatory justification)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/reports/REP-1083/reject', {
      rejectionReason: 'On-site investigation reveals crack is superficial plaster detachment on old masonry, not slope shear fissure.',
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (res.data.data.status !== 'Rejected') throw new Error(`Expected Rejected, got ${res.data.data.status}`);
    console.log(`       -> Report REP-1083 rejected with reason documented.`);
  });

  // 12. Escalate Citizen Report
  await assertRoute('POST /api/field-officer/reports/:id/escalate (Escalates hazard report to high command)', async () => {
    const res = await injectRequest('POST', '/api/field-officer/reports/REP-1082/escalate', {
      escalationReason: 'Active boulder roll trajectory points straight at village school pathway.',
      urgency: 'Critical',
      recommendedAction: 'Deploy civil defence spotters and establish 100m containment perimeter.',
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    console.log(`       -> Report REP-1082 escalated to disaster high command.`);
  });

  // 13. Update Road Status
  await assertRoute('POST /api/field-officer/road-status/update (Updates condition enum & dashboard broadcast)', async () => {
    const res = await injectRequest('POST', '/api/field-officer/road-status/update', {
      roadSegmentId: 'SEG-NH58-42',
      stretchName: 'NH-58 Km 41 - 44 (Ridge Sector)',
      condition: 'Blocked',
      reason: 'Heavy landslide debris across both lanes near chainage 42+200. Earthmovers dispatched.',
      photoUrl: 'https://images.terra360.org/roads/seg_nh58_blocked.jpg',
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`Status ${res.status}`);
    console.log(`       -> Road condition updated to Blocked and synced to officer dashboard.`);
  });

  // 14. Sector Alerts
  await assertRoute('GET /api/field-officer/alerts (Retrieves active emergency alerts for sector)', async () => {
    const res = await injectRequest('GET', '/api/field-officer/alerts');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Alerts array missing');
    console.log(`       -> Found ${res.data.data.length} active emergency alerts.`);
  });

  // 15. Acknowledge Alert
  await assertRoute('PATCH /api/field-officer/alerts/:id/acknowledge (Records acknowledgment & timestamp)', async () => {
    const res = await injectRequest('PATCH', '/api/field-officer/alerts/ALT-881/acknowledge');
    if (res.status !== 200 || !res.data.success) throw new Error(`Status ${res.status}`);
    if (!res.data.data.acknowledged) throw new Error('Alert acknowledged flag should be true');
    console.log(`       -> Alert ALT-881 acknowledged at: ${res.data.data.acknowledgedAt}`);
  });

  console.log('\n===============================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
