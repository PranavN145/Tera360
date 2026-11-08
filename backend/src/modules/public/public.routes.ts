import { Router } from 'express';
import { publicController } from './public.controller';
import { validate } from '../../middleware/validate';
import {
  getRiskMapQuerySchema,
  getAlertsQuerySchema,
  getRoadStatusQuerySchema,
} from './public.schema';

const router = Router();

// GET /api/v1/public/risk-map
router.get(
  '/risk-map',
  validate({ query: getRiskMapQuerySchema }),
  publicController.getRiskMap
);

// GET /api/v1/public/alerts
router.get(
  '/alerts',
  validate({ query: getAlertsQuerySchema }),
  publicController.getAlerts
);

// GET /api/v1/public/road-status
router.get(
  '/road-status',
  validate({ query: getRoadStatusQuerySchema }),
  publicController.getRoadStatus
);

// GET /api/v1/public/stats
router.get('/stats', publicController.getStats);

export default router;

