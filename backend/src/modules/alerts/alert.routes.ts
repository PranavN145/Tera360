import { Router } from 'express';
import { alertController } from './alert.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';
import {
  createAlertSchema,
  approveAlertSchema,
  cancelAlertSchema,
  listAlertsQuerySchema,
} from './alert.schema';

const router = Router();

// 1. Create alert draft
router.post(
  '/',
  requireAuth,
  roleGuard('officer', 'admin'),
  validate({ body: createAlertSchema }),
  alertController.createDraft
);

// 2. List all alerts (including drafts/cancelled) for operations
router.get(
  '/',
  requireAuth,
  roleGuard('officer', 'admin'),
  validate({ query: listAlertsQuerySchema }),
  alertController.listAlerts
);

// 3. Get alert details
router.get(
  '/:id',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  alertController.getAlertById
);

// 4. Render channel preview
router.post(
  '/:id/preview',
  requireAuth,
  roleGuard('officer', 'admin'),
  alertController.previewAlert
);

// 5. Approve & send alert (PRD §14.3: strictly officer role; admin cannot approve)
router.post(
  '/:id/approve',
  requireAuth,
  roleGuard('officer'),
  validate({ body: approveAlertSchema }),
  alertController.approveAlert
);

// 6. Cancel alert
router.post(
  '/:id/cancel',
  requireAuth,
  roleGuard('officer', 'admin'),
  validate({ body: cancelAlertSchema }),
  alertController.cancelAlert
);

// 7. Get delivery status log
router.get(
  '/:id/deliveries',
  requireAuth,
  roleGuard('officer', 'admin'),
  alertController.getDeliveries
);

// 8. Retry failed deliveries
router.post(
  '/:id/retry-failed',
  requireAuth,
  roleGuard('officer', 'admin'),
  alertController.retryFailedDeliveries
);

export default router;

