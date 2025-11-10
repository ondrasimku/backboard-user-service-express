import { Router } from 'express';
import container from '../config/container';
import { AuthController } from '../controllers/authController';
import { TYPES } from '../types/di.types';

const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify/:token', authController.verifyEmail);

export default router;

