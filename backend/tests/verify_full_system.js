/**
 * Comprehensive End-to-End Verification for Field Officer & Auth Flow
 * Path: backend/tests/verify_full_system.js
 */

const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log("=== STARTING FULL RUNTIME VERIFICATION ===");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  // 1. Health check & reset
  await test("Backend Health Check & Reset", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/health', method: 'GET' });
    if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
    await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/reset', method: 'POST' });
  });

  // 2. Auth: Field Officer Login with ID
  await test("POST /api/v1/auth/login (Field Officer ID: OFF-2026-094)", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'OFF-2026-094', password: 'Password123!', role: 'field-officer' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.body.data.user.role !== 'field_officer') throw new Error(`Unexpected role: ${res.body.data.user.role}`);
    if (res.body.data.user.name !== 'Officer K. Patil') throw new Error(`Unexpected name: ${res.body.data.user.name}`);
    if (res.body.data.user.assignedArea !== 'Sector 4 - Hill Highway Corridors') throw new Error(`Unexpected sector: ${res.body.data.user.assignedArea}`);
  });

  // 3. Auth: Field Officer Login with phone
  await test("POST /api/auth/login (Field Officer Phone)", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: '+91 98765 43210', password: 'Password123!', role: 'field-officer' });
    if (res.status !== 200 || res.body.data.user.id !== 'OFF-2026-094') throw new Error(`Failed to match by phone`);
  });

  // 4. Auth: Disaster Command Login
  await test("POST /api/v1/auth/login (Disaster Command)", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'officer@terra360.in', password: 'Password123!', role: 'officer' });
    if (res.status !== 200 || res.body.data.user.role !== 'officer') throw new Error(`Role mismatch`);
  });

  // 5. Auth: Session Me
  await test("GET /api/v1/users/me (Current Session Profile)", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/v1/users/me', method: 'GET' });
    if (res.status !== 200 || !res.body.data.user) throw new Error(`Status ${res.status}`);
  });

  // 6. Officer Profile
  await test("GET /api/field-officer/profile (Officer K. Patil metadata)", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/profile', method: 'GET' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const prof = res.body.data;
    if (prof.id !== 'OFF-2026-094') throw new Error(`ID ${prof.id} mismatch`);
    if (prof.department !== 'Disaster & Landslide Rapid Response Unit') throw new Error(`Dept mismatch`);
    if (prof.assignedArea !== 'Sector 4 - Hill Highway Corridors') throw new Error(`Area mismatch`);
    if (prof.phone !== '+91 98765 43210') throw new Error(`Phone mismatch`);
  });

  // 7. Profile Language
  await test("PATCH /api/field-officer/profile/language (Update to HI)", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/field-officer/profile/language',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { language: 'HI' });
    if (res.status !== 200 || res.body.data.language !== 'HI') throw new Error(`Failed language update`);
  });

  // 8. Officer Tasks
  await test("GET /api/field-officer/tasks", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/tasks', method: 'GET' });
    if (res.status !== 200 || !Array.isArray(res.body.data) || res.body.data.length === 0) throw new Error(`No tasks`);
  });

  // 9. Start Task
  await test("PATCH /api/field-officer/tasks/TSK-401/start", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/field-officer/tasks/TSK-401/start',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, {});
    if (res.status !== 200 || res.body.data.status !== 'In_Progress') throw new Error(`Task start failed`);
  });

  // 10. Complete Task
  await test("PATCH /api/field-officer/tasks/TSK-401/complete", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/field-officer/tasks/TSK-401/complete',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { notes: "Retaining wall stabilized, tension crack monitoring gauge installed." });
    if (res.status !== 200 || res.body.data.status !== 'Completed') throw new Error(`Task complete failed`);
  });

  // 11. Escalate Task
  await test("POST /api/field-officer/tasks/TSK-402/escalate", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/field-officer/tasks/TSK-402/escalate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { priority: "High", reason: "Culvert foundation eroding, heavy machinery required." });
    const taskObj = res.body.data.task || res.body.data;
    if (res.status !== 200 || taskObj.status !== 'Escalated') throw new Error(`Task escalate failed`);
  });

  // 12. Map Data
  await test("GET /api/field-officer/map/data", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/map/data', method: 'GET' });
    if (res.status !== 200 || !res.body.data.villages) throw new Error(`Map data invalid`);
  });

  // 13. Reports
  await test("GET /api/field-officer/reports", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/reports', method: 'GET' });
    if (res.status !== 200 || !Array.isArray(res.body.data)) throw new Error(`Reports invalid`);
  });

  // 14. Road Status
  await test("POST /api/field-officer/road-status/update", async () => {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/field-officer/road-status/update',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      roadSegmentId: "SEG-NH58-42",
      condition: "Caution",
      reason: "Rock fragments cleared; wet mud on shoulder."
    });
    const statusObj = res.body.data.roadStatus || res.body.data;
    if (res.status !== 200 || statusObj.condition !== 'Caution') throw new Error(`Road status update failed`);
  });

  // 15. Sector Alerts
  await test("GET /api/field-officer/alerts", async () => {
    const res = await request({ hostname: 'localhost', port: 5000, path: '/api/field-officer/alerts', method: 'GET' });
    if (res.status !== 200 || !Array.isArray(res.body.data)) throw new Error(`Alerts invalid`);
  });

  // 16. Frontend Next.js /login page serving
  await test("Frontend GET http://localhost:3000/login", async () => {
    const res = await request({ hostname: 'localhost', port: 3000, path: '/login', method: 'GET' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // 17. Frontend Next.js /officer page serving
  await test("Frontend GET http://localhost:3000/officer", async () => {
    const res = await request({ hostname: 'localhost', port: 3000, path: '/officer', method: 'GET' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  console.log(`\n===================================`);
  console.log(`VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("FATAL ERROR IN RUNTIME VERIFICATION:", e);
  process.exit(1);
});
