import { Router } from 'express';
import { z } from 'zod';
import { roadController } from './road.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

const updateRoadStatusSchema = z.object({
  status: z.enum(['open', 'caution', 'partial', 'blocked']),
  riskLevel: z.enum(['Low', 'Moderate', 'High', 'Critical']).optional(),
  statusReason: z.string().trim().max(500).optional(),
});

const computeSafeRouteSchema = z.object({
  origin: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  state: z.string().trim().optional(),
});

// PATCH /api/v1/roads/:id/status
router.patch(
  '/:id/status',
  requireAuth,
  roleGuard('officer', 'admin', 'field_officer'),
  validate({ body: updateRoadStatusSchema }),
  roadController.updateStatus
);

// GET /api/v1/roads/impact
router.get(
  '/impact',
  requireAuth,
  roleGuard('officer', 'admin'),
  roadController.getImpactedRoads
);

// POST /api/v1/roads/safe-route
router.post(
  '/safe-route',
  requireAuth,
  validate({ body: computeSafeRouteSchema }),
  roadController.computeSafeRoute
);

export default router;
