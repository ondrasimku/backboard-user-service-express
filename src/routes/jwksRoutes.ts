import { Router } from 'express';
import container from '../config/container';
import { TYPES } from '../types/di.types';
import { JwksController } from '../controllers/jwksController';

const router = Router();
const jwksController = container.get<JwksController>(TYPES.JwksController);

router.get('/.well-known/jwks.json', jwksController.getJwks);

export default router;

