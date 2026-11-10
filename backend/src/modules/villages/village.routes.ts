import { Router } from 'express';
import { z } from 'zod';
import { villageController } from './village.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

router.use(requireAuth);

const updateEvacuationSchema = z.object({
  evacuationStatus: z.enum(['Normal', 'Advisory', 'Evacuate']),
  notes: z.string().trim().max(500).optional(),
});

// GET /api/v1/villages
router.get('/', villageController.listVillages);

// GET /api/v1/villages/:id
router.get('/:id', villageController.getVillageById);

// PATCH /api/v1/villages/:id/evacuation
router.patch(
  '/:id/evacuation',
  roleGuard('officer', 'admin'),
  validate({ body: updateEvacuationSchema }),
  villageController.updateEvacuationStatus
);

export default router;

