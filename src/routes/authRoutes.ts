import { Router } from 'express';
import container from '../config/container';
import { AuthController } from '../controllers/authController';
import { TYPES } from '../types/di.types';

const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify/:token', authController.verifyEmail);
router.post('/password-reset/request', authController.requestPasswordReset);
router.get('/password-reset/verify/:token', authController.verifyPasswordResetToken);
router.post('/password-reset/reset', authController.resetPassword);

export default router;

