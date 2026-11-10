import { Router } from 'express';
import { citizenController } from './citizen.controller';
import { checkInSchema } from './citizen.schema';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

// Citizen Profile / Area Endpoints (mounted at /api/v1/me)
router.get('/area', citizenController.getArea);
router.get('/area/map', citizenController.getAreaMap);
router.get('/safe-place', citizenController.getSafePlace);
router.post('/checkin', validate({ body: checkInSchema }), citizenController.submitCheckIn);
router.get('/checkins', citizenController.listCheckIns);
router.get('/offline-bundle', citizenController.getOfflineBundle);

export default router;
