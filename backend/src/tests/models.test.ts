import assert from 'assert';
import { Alert } from '../modules/alerts/alert.model';
import { Road } from '../modules/roads/road.model';
import { Report } from '../modules/reports/report.model';
import { Contact } from '../modules/contact/contact.model';
import { User } from '../modules/users/user.model';

async function runModelTests() {
  console.log('\n========================================================');
  console.log('🧪 TERRA360 PHASE 2.1: PUBLIC API MODELS TEST SUITE');
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

  // 1. Alert Model Validation
  console.log('--- [Group 1: Alert Model Validation] ---');

  await test('Alert requires title, severity, state, corridor, description, and advisory', async () => {
    const alert = new Alert({});
    const err = alert.validateSync();
    assert.ok(err?.errors['title'], 'Expected title error');
    assert.ok(err?.errors['severity'], 'Expected severity error');
    assert.ok(err?.errors['state'], 'Expected state error');
    assert.ok(err?.errors['corridor'], 'Expected corridor error');
    assert.ok(err?.errors['description'], 'Expected description error');
    assert.ok(err?.errors['advisory'], 'Expected advisory error');
  });

  await test('Alert rejects invalid severity enum', async () => {
    const alert = new Alert({
      title: 'Landslide Alert',
      severity: 'Extreme' as any,
      state: 'Nagaland',
      corridor: 'NH-29',
      description: 'Slide detected',
      advisory: 'Halt vehicles',
    });
    const err = alert.validateSync();
    assert.ok(err?.errors['severity']);
  });

  await test('Alert defaults status to "draft"', async () => {
    const alert = new Alert({
      title: 'Landslide Alert',
      severity: 'Critical',
      state: 'Nagaland',
      corridor: 'NH-29',
      description: 'Slide detected',
      advisory: 'Halt vehicles',
    });
    assert.strictEqual(alert.status, 'draft');
    assert.strictEqual(alert.validateSync(), undefined);
  });

  // 2. Road Model Validation
  console.log('\n--- [Group 2: Road / Corridor Model Validation] ---');

  await test('Road requires name, code, state, and stretch', async () => {
    const road = new Road({});
    const err = road.validateSync();
    assert.ok(err?.errors['name'], 'Expected name error');
    assert.ok(err?.errors['code'], 'Expected code error');
    assert.ok(err?.errors['state'], 'Expected state error');
    assert.ok(err?.errors['stretch'], 'Expected stretch error');
  });

  await test('Road defaults status to "open" and riskLevel to "Low"', async () => {
    const road = new Road({
      name: 'NH-29 Kohima–Dimapur',
      code: 'nh-29',
      state: 'Nagaland',
      stretch: 'Mile 38 Chumukedima Cut',
    });
    assert.strictEqual(road.status, 'open');
    assert.strictEqual(road.riskLevel, 'Low');
    assert.strictEqual(road.isMajorNH, true);
    assert.strictEqual(road.code, 'NH-29'); // uppercase trimmed
    assert.strictEqual(road.validateSync(), undefined);
  });

  await test('Road rejects invalid status and riskLevel enums', async () => {
    const road = new Road({
      name: 'NH-29',
      code: 'NH-29',
      state: 'Nagaland',
      stretch: 'Mile 38',
      status: 'flooded' as any,
      riskLevel: 'Hazardous' as any,
    });
    const err = road.validateSync();
    assert.ok(err?.errors['status']);
    assert.ok(err?.errors['riskLevel']);
  });

  // 3. Report Model Validation
  console.log('\n--- [Group 3: Public Report Model Validation] ---');

  await test('Report requires reportId, state, location, hazardType, and description', async () => {
    const report = new Report({});
    const err = report.validateSync();
    assert.ok(err?.errors['reportId'], 'Expected reportId error');
    assert.ok(err?.errors['state'], 'Expected state error');
    assert.ok(err?.errors['location'], 'Expected location error');
    assert.ok(err?.errors['hazardType'], 'Expected hazardType error');
    assert.ok(err?.errors['description'], 'Expected description error');
  });

  await test('Report defaults status to "submitted" and source to "public"', async () => {
    const report = new Report({
      reportId: 'tr-2026-1001',
      state: 'Assam',
      location: 'Dima Hasao Hill Rail Stretch',
      hazardType: 'active-slide',
      description: 'Debris rolling onto highway.',
    });
    assert.strictEqual(report.status, 'submitted');
    assert.strictEqual(report.source, 'public');
    assert.strictEqual(report.severity, 'Warning');
    assert.strictEqual(report.reportId, 'TR-2026-1001'); // uppercase trimmed
    assert.strictEqual(report.validateSync(), undefined);
  });

  // 4. Contact Model Validation
  console.log('\n--- [Group 4: Contact Message Model Validation] ---');

  await test('Contact requires name, email, state, and message', async () => {
    const contact = new Contact({});
    const err = contact.validateSync();
    assert.ok(err?.errors['name'], 'Expected name error');
    assert.ok(err?.errors['email'], 'Expected email error');
    assert.ok(err?.errors['state'], 'Expected state error');
    assert.ok(err?.errors['message'], 'Expected message error');
  });

  await test('Contact validates email format and defaults status to "new"', async () => {
    const badContact = new Contact({
      name: 'Ramesh',
      email: 'not-an-email',
      state: 'Assam',
      message: 'Urgent inquiry',
    });
    const badErr = badContact.validateSync();
    assert.ok(badErr?.errors['email']);

    const goodContact = new Contact({
      name: 'Ramesh Kalita',
      email: 'Ramesh@Example.in',
      state: 'Assam',
      message: 'Highway road status inquiry near Haflong.',
    });
    assert.strictEqual(goodContact.email, 'ramesh@example.in'); // lowercased
    assert.strictEqual(goodContact.status, 'new');
    assert.strictEqual(goodContact.validateSync(), undefined);
  });

  // 5. User Model Validation (Village, Family Contacts, Alert Preferences)
  console.log('--- [Group 5: User Profile Model Validation] ---');

  await test('User supports village, structured family contacts, and alert preferences', async () => {
    const user = new User({
      name: 'Temsula Ao',
      email: 'temsula@terra360.in',
      passwordHash: 'dummyhash',
      role: 'citizen',
      village: {
        state: 'Nagaland',
        district: 'Kohima',
        villageName: 'Phesama',
      },
      familyContacts: [
        { name: 'Moa Ao', phone: '+91 94360 11111', relationship: 'Spouse' },
      ],
      alertPreferences: {
        ivrs: true,
        sms: true,
        app: false,
      },
    });

    const err = user.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(user.village?.villageName, 'Phesama');
    assert.strictEqual(user.familyContacts?.length, 1);
    assert.strictEqual(user.alertPreferences?.app, false);
    assert.strictEqual(user.alertPreferences?.ivrs, true);
  });

  await test('User family contacts require name and phone', async () => {
    const user = new User({
      name: 'Bad Contact User',
      email: 'badcontact@terra360.in',
      passwordHash: 'dummyhash',
      familyContacts: [
        { name: '', phone: '' } as any,
      ],
    });

    const err = user.validateSync();
    assert.ok(err?.errors['familyContacts.0.name']);
    assert.ok(err?.errors['familyContacts.0.phone']);
  });

  console.log('\n========================================================');
  console.log(`📊 MODEL TEST RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runModelTests().catch(err => {
  console.error(err);
  process.exit(1);
});

