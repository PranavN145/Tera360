import { Router } from 'express';
import { citizenController } from '../citizen/citizen.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

// GET /api/v1/notifications
router.get('/', citizenController.listNotifications);

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', citizenController.markAllNotificationsRead);

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', citizenController.markNotificationRead);

export default router;

