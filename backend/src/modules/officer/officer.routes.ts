import { Router } from 'express';
import { officerController } from './officer.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

router.use(requireAuth, roleGuard('officer', 'admin'));

// GET /api/v1/officer/dashboard
router.get('/dashboard', officerController.getDashboard);

// GET /api/v1/officer/data-status
router.get('/data-status', officerController.getDataStatus);

export default router;

