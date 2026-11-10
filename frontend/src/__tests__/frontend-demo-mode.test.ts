/**
 * Automated Verification Test Suite for Frontend-First Development Mode
 * Tests DemoDataManager, local persistence, cross-portal synchronization,
 * and API fallback contracts.
 */

import assert from 'node:assert';
import { demoDataManager } from '../data/demoDataManager';

let passedTests = 0;
let totalTests = 0;

function it(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`  ✓ ${name}`);
        passedTests++;
      }).catch((err) => {
        console.error(`  ✗ ${name}:`, err.message);
        throw err;
      });
    } else {
      console.log(`  ✓ ${name}`);
      passedTests++;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${name}:`, errorMsg);
    throw err;
  }
}

async function runTestSuite() {
  console.log('\n--- Running Frontend-First Mode Verification Suite ---\n');

  // Test 1: Seed Data Completeness
  it('should seed default accounts for all 5 roles', () => {
    const users = demoDataManager.getDemoUsersMap();
    assert.ok(users['citizen@terra360.in'], 'Citizen account exists');
    assert.strictEqual(users['citizen@terra360.in'].role, 'citizen');
    assert.ok(users['officer@terra360.in'], 'Officer account exists');
    assert.strictEqual(users['officer@terra360.in'].role, 'officer');
    assert.ok(users['field@terra360.in'], 'Field Officer account exists');
    assert.strictEqual(users['field@terra360.in'].role, 'field_officer');
    assert.ok(users['driver@terra360.in'], 'Driver account exists');
    assert.strictEqual(users['driver@terra360.in'].role, 'driver');
    assert.ok(users['admin@terra360.in'], 'Admin account exists');
    assert.strictEqual(users['admin@terra360.in'].role, 'admin');
  });

  // Test 2: Active Demo User Authentication Simulation
  it('should allow authenticating and setting active demo user', () => {
    const citizen = demoDataManager.findDemoUserByEmail('citizen@terra360.in');
    assert.ok(citizen);
    demoDataManager.setActiveDemoUser(citizen);

    const active = demoDataManager.getActiveDemoUser();
    assert.ok(active);
    assert.strictEqual(active?.email, 'citizen@terra360.in');
    assert.strictEqual(active?.village?.villageName, 'Phesama');
    assert.strictEqual(active?.familyContacts?.length, 2);
  });

  // Test 3: Profile Mutation & Persistence
  it('should update citizen profile, village, contacts and alert preferences', () => {
    const updated = demoDataManager.updateDemoProfile({
      name: 'Temjen Ao (Updated)',
      phone: '+91 94360 99999',
      village: {
        state: 'Nagaland',
        district: 'Kohima',
        villageName: 'Phesama Upper Ridge',
      },
      familyContacts: [
        {
          name: 'Arenla Ao',
          phone: '+91 94360 98765',
          relationship: 'Spouse',
        },
        {
          name: 'Toshitsungba Jamir',
          phone: '+91 98621 11204',
          relationship: 'Relative',
        },
      ],
      alertPreferences: {
        ivrs: true,
        sms: false,
        app: true,
      },
    });

    assert.strictEqual(updated.name, 'Temjen Ao (Updated)');
    assert.strictEqual(updated.phone, '+91 94360 99999');
    assert.strictEqual(updated.village?.villageName, 'Phesama Upper Ridge');
    assert.strictEqual(updated.familyContacts?.length, 2);
    assert.strictEqual(updated.alertPreferences?.sms, false);

    // Verify active demo user reflection
    const active = demoDataManager.getActiveDemoUser();
    assert.strictEqual(active?.name, 'Temjen Ao (Updated)');
    assert.strictEqual(active?.phone, '+91 94360 99999');
  });

  // Test 4: Hazard Report Creation & Cross-Portal Synchronization
  it('should submit a new hazard report and synchronize across portals', () => {
    const initialStats = demoDataManager.getDemoStats();
    const initialReportCount = initialStats.communityReportsSubmitted;

    const newReport = demoDataManager.addDemoReport({
      state: 'Nagaland',
      location: 'KM 45 Dzüdza Bridge Curve',
      hazardType: 'Landslide',
      severity: 'Critical',
      description: 'Mudflow and slope slump blocking northern lane.',
      reporterName: 'Temjen Ao',
      reporterPhone: '+91 94360 99999',
      coordinates: {
        type: 'Point',
        coordinates: [94.02, 25.72],
      },
    });

    assert.ok(newReport.reportId.startsWith('TR-2026-'));
    assert.strictEqual(newReport.hazardType, 'Landslide');
    assert.strictEqual(newReport.status, 'submitted');

    // Verify it appears in citizen reports
    const myReports = demoDataManager.getMyDemoReports();
    assert.ok(myReports.some((r) => r.reportId === newReport.reportId));

    // Verify it appears in officer filtered reports
    const officerNagalandReports = demoDataManager.filterReports({ state: 'Nagaland' });
    assert.ok(officerNagalandReports.some((r) => r.reportId === newReport.reportId));

    // Verify stats updated
    const updatedStats = demoDataManager.getDemoStats();
    assert.strictEqual(
      updatedStats.communityReportsSubmitted,
      initialReportCount + 1,
      'Report count incremented in operational stats'
    );
  });

  // Test 5: Alerts & Road Clearance Filter Testing
  it('should filter alerts and road statuses accurately', () => {
    const nagalandAlerts = demoDataManager.filterAlerts({ state: 'Nagaland' });
    assert.ok(nagalandAlerts.alerts.length >= 1);
    assert.strictEqual(nagalandAlerts.alerts[0].state, 'Nagaland');

    const blockedRoads = demoDataManager.filterRoads({ status: 'blocked' });
    assert.ok(blockedRoads.length >= 1);
    assert.strictEqual(blockedRoads[0].status, 'blocked');
    assert.strictEqual(blockedRoads[0].code, 'NH-29');
  });

  // Test 6: Sessions & Account Data Export
  it('should provide sessions and export structure conforming to schema', () => {
    const sessions = demoDataManager.getDemoSessions();
    assert.ok(sessions.length >= 1);
    assert.strictEqual(sessions[0].id, 'session-demo-current');
    assert.strictEqual(sessions[0].isCurrent, true);

    const exportData = demoDataManager.exportDemoData();
    assert.ok(exportData.account);
    assert.strictEqual(exportData.account.email, 'citizen@terra360.in');
    assert.ok(Array.isArray(exportData.reports));
  });

  // Test 7: Demo Mode State Indicator
  it('should report demo mode as active when demo user exists or backend offline', () => {
    assert.strictEqual(demoDataManager.isDemoModeActive(), true);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed successfully.\n`);
}

runTestSuite().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
