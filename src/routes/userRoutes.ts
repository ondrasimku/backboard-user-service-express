import { Router } from 'express';
import { authenticateToken, requirePermissions } from '../middlewares/auth';
import container from '../config/container';
import { UserController } from '../controllers/userController';
import { TYPES } from '../types/di.types';
import { PERMISSIONS } from '../config/permissions';

const router = Router();
const userController = container.get<UserController>(TYPES.UserController);

router.get('/me', authenticateToken, userController.getCurrentUser);
router.patch('/me', authenticateToken, userController.updateCurrentUserProfile);
router.patch('/me/avatar', authenticateToken, userController.setAvatar);

router.get(
  '/metrics',
  authenticateToken,
  requirePermissions([PERMISSIONS.USERS_READ]),
  userController.getMetrics
);

router.get(
  '/:id',
  authenticateToken,
  requirePermissions([PERMISSIONS.USERS_READ]),
  userController.getUserById
);

router.get(
  '/',
  authenticateToken,
  requirePermissions([PERMISSIONS.USERS_READ]),
  userController.getAllUsers
);

export default router;
