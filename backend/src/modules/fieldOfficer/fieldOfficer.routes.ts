/**
 * Terra360 Field Officer Portal Routes (TypeScript)
 */

import { Router } from 'express';
import { fieldOfficerController } from './fieldOfficer.controller';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/requireAuth';
import {
  updateLanguageSchema,
  taskParamsSchema,
  completeTaskSchema,
  escalateTaskSchema,
  reportParamsSchema,
  verifyReportSchema,
  rejectReportSchema,
  escalateReportSchema,
  updateRoadStatusSchema,
  alertParamsSchema,
} from './fieldOfficer.schema';

const router = Router();
router.use(optionalAuth);

// ── Profile ─────────────────────────────────────────────────────────────────
router.get('/profile', fieldOfficerController.getProfile);
router.patch(
  '/profile/language',
  validate({ body: updateLanguageSchema }),
  fieldOfficerController.updateLanguage
);

// ── Tasks ───────────────────────────────────────────────────────────────────
router.get('/tasks', fieldOfficerController.getTasks);
router.patch(
  '/tasks/:id/start',
  validate({ params: taskParamsSchema }),
  fieldOfficerController.startTask
);
router.patch(
  '/tasks/:id/complete',
  validate({ params: taskParamsSchema, body: completeTaskSchema }),
  fieldOfficerController.completeTask
);
router.post(
  '/tasks/:id/escalate',
  validate({ params: taskParamsSchema, body: escalateTaskSchema }),
  fieldOfficerController.escalateTask
);

// ── Map Data ────────────────────────────────────────────────────────────────
router.get('/map/data', fieldOfficerController.getMapData);

// ── Villager Reports ────────────────────────────────────────────────────────
router.get('/reports', fieldOfficerController.getReports);
router.patch(
  '/reports/:id/verify',
  validate({ params: reportParamsSchema, body: verifyReportSchema }),
  fieldOfficerController.verifyReport
);
router.patch(
  '/reports/:id/reject',
  validate({ params: reportParamsSchema, body: rejectReportSchema }),
  fieldOfficerController.rejectReport
);
router.post(
  '/reports/:id/escalate',
  validate({ params: reportParamsSchema, body: escalateReportSchema }),
  fieldOfficerController.escalateReport
);

// ── Road Status ─────────────────────────────────────────────────────────────
router.get('/road-status/current', fieldOfficerController.getCurrentRoadStatus);
router.post(
  '/road-status/update',
  validate({ body: updateRoadStatusSchema }),
  fieldOfficerController.updateRoadStatus
);

// ── Sector Alerts ───────────────────────────────────────────────────────────
router.get('/alerts', fieldOfficerController.getAlerts);
router.patch(
  '/alerts/:id/acknowledge',
  validate({ params: alertParamsSchema }),
  fieldOfficerController.acknowledgeAlert
);

export default router;

