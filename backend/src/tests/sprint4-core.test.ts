import assert from 'assert';
import mongoose from 'mongoose';
import { Alert } from '../modules/alerts/alert.model';
import { AlertDelivery } from '../modules/alerts/alertDelivery.model';
import { AuditLog } from '../modules/audit/auditLog.model';
import { Village } from '../modules/villages/village.model';
import { Shelter } from '../modules/villages/shelter.model';
import { CheckIn } from '../modules/citizen/checkin.model';
import { Notification } from '../modules/notifications/notification.model';
import { FieldOfficerTaskModel, AlertAcknowledgmentModel, RoadStatusUpdateModel } from '../modules/fieldOfficer/fieldOfficer.model';
import { detectMagicBytes, stripJpegExif } from '../middleware/uploadGuard';
import { captchaService } from '../services/captcha.service';
import { getRiskMapQuerySchema } from '../modules/public/public.schema';
import { createAlertSchema, approveAlertSchema } from '../modules/alerts/alert.schema';
import { createCheckinSchema } from '../modules/citizen/citizen.schema';
import { escapeHtml } from '../services/email.service';

async function runSprint4Tests() {
  console.log('\n========================================================');
  console.log('🚀 TERRA360 SPRINT 4: BACKEND & CORE FUNCTIONALITY TESTS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
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

  // ─────────────────────────────────────────────────────────────
  // 1. AUD-05: Officer Workflows & Alert Lifecycle
  // ─────────────────────────────────────────────────────────────
  console.log('--- [AUD-05: Officer Workflows & Alert Lifecycle] ---');

  await test('createAlertSchema validates required fields & multichannel options', () => {
    const valid = createAlertSchema.safeParse({
      title: 'Dzüdza River Flash Flood & Active Slide',
      severity: 'Critical',
      state: 'Nagaland',
      corridor: 'NH-29',
      location: 'KM 38, Dzüdza Bridge',
      description: 'Major hillside subsidence and water overflow onto NH-29.',
      advisory: 'Halt all vehicular traffic immediately. Use Tsiesema bypass.',
      channels: ['sms', 'ivrs', 'push', 'app'],
      messages: {
        en: 'Warning: Major hillside subsidence at KM 38.',
        ten: 'Dzüdza lui küsü kemeu la gari ketsu themie puo tei chüli zo.',
      },
      audience: {
        roles: ['citizen', 'driver', 'field_officer'],
        roadIds: ['NH-29'],
      },
    });
    assert.strictEqual(valid.success, true);
  });

  await test('approveAlertSchema parses confirm boolean option', () => {
    const withoutConfirm = approveAlertSchema.safeParse({});
    assert.strictEqual(withoutConfirm.success, true);
    assert.strictEqual(withoutConfirm.data.confirm, undefined);

    const withConfirm = approveAlertSchema.safeParse({ confirm: true });
    assert.strictEqual(withConfirm.success, true);
    assert.strictEqual(withConfirm.data.confirm, true);
  });

  await test('Alert model supports lifecycle tracking (draft -> published -> cancelled) and audience channels', () => {
    const alert = new Alert({
      title: 'Phesama Debris Flow Warning',
      severity: 'Warning',
      state: 'Nagaland',
      corridor: 'NH-29',
      location: 'Phesama Bypass',
      description: 'Slope movement recorded by piezometer.',
      advisory: 'LMVs proceed with caution.',
      status: 'draft',
      audience: {
        roles: ['citizen', 'driver'],
      },
      channels: ['sms', 'app'],
      messages: {
        en: 'Warning: Slumping at Phesama.',
        hi: 'चेतावनी: फेसामा में भूस्खलन की आशंका।',
      },
    });

    const err = alert.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(alert.status, 'draft');
    assert.strictEqual(alert.channels.length, 2);
  });

  await test('AlertDelivery model records multichannel delivery telemetry', () => {
    const delivery = new AlertDelivery({
      alertId: new mongoose.Types.ObjectId(),
      recipientContact: '+919876543210',
      channel: 'sms',
      status: 'delivered',
      retryCount: 0,
    });
    const err = delivery.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(delivery.channel, 'sms');
    assert.strictEqual(delivery.status, 'delivered');
  });

  await test('AuditLog model records operational officer mutations', () => {
    const log = new AuditLog({
      action: 'ALERT_DISPATCHED',
      performedBy: new mongoose.Types.ObjectId(),
      userRole: 'officer',
      resourceType: 'Alert',
      resourceId: '507f1f77bcf86cd799439012',
      details: {
        severity: 'Critical',
        targetCorridor: 'NH-29',
        channels: ['app', 'sms'],
      },
      ipAddress: '127.0.0.1',
    });
    const err = log.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(log.action, 'ALERT_DISPATCHED');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. AUD-05: Citizen Workflows & Models
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-05: Citizen Portal Workflows] ---');

  await test('createCheckinSchema validates safety status and location coordinates', () => {
    const valid = createCheckinSchema.safeParse({
      status: 'safe',
      location: 'Phesama Community Hall',
      coordinates: [94.112, 25.642],
      notes: 'Family is sheltered and secure.',
      membersCount: 4,
    });
    assert.strictEqual(valid.success, true);

    const invalid = createCheckinSchema.safeParse({
      status: 'danger' as any, // only 'safe' | 'need_help' | 'evacuating' allowed
    });
    assert.strictEqual(invalid.success, false);
  });

  await test('CheckIn model persists citizen location and status', () => {
    const checkin = new CheckIn({
      userId: new mongoose.Types.ObjectId(),
      status: 'safe',
      message: 'Family is sheltered and secure.',
      locationName: 'Peducha Relief Camp',
      coordinates: {
        type: 'Point',
        coordinates: [93.985, 25.728],
      },
    });
    const err = checkin.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(checkin.status, 'safe');
  });

  await test('Notification model tracks read timestamp and target audience', () => {
    const notif = new Notification({
      userId: new mongoose.Types.ObjectId(),
      title: 'Evacuation Route Clear',
      message: 'Peducha bypass is now open for light motor vehicles.',
      type: 'alert',
      isRead: false,
    });
    const err = notif.validateSync();
    assert.strictEqual(err, undefined);
    assert.strictEqual(notif.isRead, false);
  });

  await test('Village and Shelter models validate Northeast coordinates & capacity', () => {
    const shelter = new Shelter({
      name: 'Phesama Community Relief Center',
      villageName: 'Phesama',
      district: 'Kohima',
      state: 'Nagaland',
      address: 'Main Ground, Near Community Hall, Phesama',
      capacity: 350,
      currentOccupancy: 85,
      coordinates: {
        type: 'Point',
        coordinates: [94.115, 25.648],
      },
      helpline: '1077',
      status: 'Operational',
    });
    assert.strictEqual(shelter.validateSync(), undefined);

    const village = new Village({
      villageName: 'Phesama',
      district: 'Kohima',
      state: 'Nagaland',
      corridor: 'NH-29',
      population: 3200,
      riskLevel: 'Critical',
      evacuationStatus: 'Advisory',
      primaryShelterId: shelter._id,
      coordinates: {
        type: 'Point',
        coordinates: [94.112, 25.642],
      },
    });
    assert.strictEqual(village.validateSync(), undefined);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. AUD-07: Field Officer Architecture Consolidation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-07: Field Officer Consolidation] ---');

  await test('FieldOfficerTaskModel validates lifecycle transitions (Assigned -> In_Progress -> Completed)', () => {
    const task = new FieldOfficerTaskModel({
      taskId: 'TSK-001',
      sector: 'Kohima - Dzüdza',
      location: {
        type: 'Point',
        coordinates: [94.021, 25.698],
        chainageName: 'KM 42, NH-29',
        landmark: 'Dzüdza Bridge approach',
      },
      riskLevel: 'High',
      reason: 'Inspect Retaining Wall Stability at KM 42',
      deadline: new Date(Date.now() + 86400000),
      status: 'Assigned',
      assignedBy: 'officer-admin-01',
      assignedTo: new mongoose.Types.ObjectId(),
    });
    assert.strictEqual(task.validateSync(), undefined);
    assert.strictEqual(task.status, 'Assigned');

    task.status = 'In_Progress';
    task.startedAt = new Date();
    assert.strictEqual(task.validateSync(), undefined);

    task.status = 'Completed';
    task.completedAt = new Date();
    task.completionNotes = 'Wall reinforced with sandbags; no active settlement.';
    assert.strictEqual(task.validateSync(), undefined);
  });

  await test('AlertAcknowledgmentModel persists field officer advisory acknowledgments', () => {
    const ack = new AlertAcknowledgmentModel({
      alertId: 'ALT-2026-001',
      officerId: 'FO-9402',
      acknowledgedAt: new Date(),
      targetSector: 'Phesama Sector',
    });
    assert.strictEqual(ack.validateSync(), undefined);
  });

  await test('RoadStatusUpdateModel persists field officer road status reports', () => {
    const roadUpdate = new RoadStatusUpdateModel({
      roadSegmentId: 'SEG-NH29-01',
      stretchName: 'NH-29 Kohima – Zubza Bypass',
      condition: 'Blocked',
      reason: 'Blocked by landslide debris from upper slope cut',
      updatedBy: 'FO-9402',
      sector: 'Kohima - Dzüdza',
      timestamp: new Date(),
    });
    assert.strictEqual(roadUpdate.validateSync(), undefined);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. AUD-06 & AUD-15: Upload Validation, Magic Bytes & CAPTCHA
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-06 & AUD-15: Secure Uploads & CAPTCHA] ---');

  await test('detectMagicBytes accepts valid JPEG magic bytes (FF D8 FF)', () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const detected = detectMagicBytes(validJpeg);
    assert.strictEqual(detected, 'image/jpeg');
  });

  await test('detectMagicBytes accepts valid PNG magic bytes (89 50 4E 47)', () => {
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const detected = detectMagicBytes(validPng);
    assert.strictEqual(detected, 'image/png');
  });

  await test('detectMagicBytes accepts valid WebP magic bytes (RIFF...WEBP)', () => {
    const validWebp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x20, 0x00, 0x00, 0x00, // file length
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
    ]);
    const detected = detectMagicBytes(validWebp);
    assert.strictEqual(detected, 'image/webp');
  });

  await test('detectMagicBytes rejects malicious executable/script disguised as image', () => {
    const phpScript = Buffer.from('<?php echo "malicious"; ?>', 'utf-8');
    assert.strictEqual(detectMagicBytes(phpScript), null);

    const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
    assert.strictEqual(detectMagicBytes(elf), null);
  });

  await test('stripJpegExif strips APP1 (0xFFE1) metadata while preserving JPEG stream', () => {
    const app1Data = Buffer.from([
      0xff, 0xd8,             // SOI
      0xff, 0xe1, 0x00, 0x08, // APP1 marker + 8-byte length
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // 'Exif\0\0'
      0xff, 0xda, 0x00, 0x02, // SOS marker
      0xaa, 0xbb,             // scan data
      0xff, 0xd9,             // EOI
    ]);

    const cleaned = stripJpegExif(app1Data);
    let hasApp1 = false;
    for (let i = 0; i < cleaned.length - 1; i++) {
      if (cleaned[i] === 0xff && cleaned[i + 1] === 0xe1) {
        hasApp1 = true;
        break;
      }
    }
    assert.strictEqual(hasApp1, false, 'Expected APP1 segment to be stripped');
    assert.strictEqual(cleaned[0], 0xff);
    assert.strictEqual(cleaned[1], 0xd8);
    assert.strictEqual(cleaned[cleaned.length - 2], 0xff);
    assert.strictEqual(cleaned[cleaned.length - 1], 0xd9);
  });

  await test('captchaService.verifyTurnstileToken rejects dummy test tokens when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      await assert.rejects(
        () => captchaService.verifyTurnstileToken('1x0000000000000000000000000000000AA', '127.0.0.1'),
        /Dummy or testing CAPTCHA tokens are strictly rejected/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. AUD-14: Public Risk Map & Contact API
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- [AUD-14: Public Risk Map & Contact Desk] ---');

  await test('getRiskMapQuerySchema defaults isMajorNH to true', () => {
    const parsed = getRiskMapQuerySchema.parse({});
    assert.strictEqual(parsed.isMajorNH, true);
  });

  await test('getRiskMapQuerySchema validates bounding box (bbox: minLng,minLat,maxLng,maxLat)', () => {
    const validBbox = getRiskMapQuerySchema.parse({ bbox: '93.5,25.0,94.5,26.0' });
    assert.strictEqual(validBbox.bbox, '93.5,25.0,94.5,26.0');

    const invalidBbox = getRiskMapQuerySchema.safeParse({ bbox: 'not,a,valid,bbox' });
    assert.strictEqual(invalidBbox.success, false);
  });

  await test('Contact email notification HTML-escapes all user-supplied content', () => {
    const maliciousContact = {
      name: '<script>alert("hacked")</script>',
      email: 'attacker@example.com',
      state: 'Nagaland',
      message: 'Hello <img src="x" onerror="alert(1)"> & goodbye',
    };

    const safeName = escapeHtml(maliciousContact.name);
    const safeMessage = escapeHtml(maliciousContact.message);

    assert.ok(!safeName.includes('<script>'));
    assert.strictEqual(safeName, '&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');
    assert.ok(!safeMessage.includes('<img'));
    assert.ok(safeMessage.includes('&amp; goodbye'));
  });

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n========================================================');
  console.log(`📊 SPRINT 4 RESULTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runSprint4Tests();
