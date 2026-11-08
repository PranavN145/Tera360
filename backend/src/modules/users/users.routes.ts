import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  updateMeSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from './users.schema';

const router = Router();

// All user endpoints require an authenticated session
router.use(requireAuth);

// 1. Profile Management
// GET /api/v1/users/me
router.get('/me', usersController.getMe);

// PATCH /api/v1/users/me
router.patch('/me', validate({ body: updateMeSchema }), usersController.updateMe);

// 2. Password Management
// PATCH /api/v1/users/me/password
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  usersController.changePassword
);

// 3. Session Management
// GET /api/v1/users/me/sessions
router.get('/me/sessions', usersController.getSessions);

// DELETE /api/v1/users/me/sessions/:id
router.delete('/me/sessions/:id', usersController.revokeSession);

// 4. Personal Data Export
// GET /api/v1/users/me/export
router.get('/me/export', usersController.exportData);

// 5. Account Deletion
// DELETE /api/v1/users/me
router.delete(
  '/me',
  validate({ body: deleteAccountSchema }),
  usersController.deleteAccount
);

export default router;
