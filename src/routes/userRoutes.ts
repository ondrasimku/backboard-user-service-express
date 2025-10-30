import { Router } from 'express';
import { authenticateToken, requirePermissions } from '../middlewares/auth';
import container from '../config/container';
import { UserController } from '../controllers/userController';
import { TYPES } from '../types/di.types';
import config from '../config/config';

const router = Router();
const userController = container.get<UserController>(TYPES.UserController);

router.get('/me', authenticateToken, userController.getCurrentUser);

router.get(
  '/:id',
  authenticateToken,
  requirePermissions(config.adminPermissions),
  userController.getUserById
);

router.get(
  '/',
  authenticateToken,
  requirePermissions(config.adminPermissions),
  userController.getAllUsers
);

export default router;
