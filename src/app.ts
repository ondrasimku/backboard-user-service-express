import 'reflect-metadata';
import express from 'express';
import container from './config/container';
import { TYPES } from './types/di.types';
import { ILogger } from './logging/logger.interface';
import { asyncContextMiddleware } from './middlewares/asyncContext';
import { createHttpLoggerMiddleware } from './middlewares/httpLogger';
import { createErrorHandler } from './middlewares/errorHandler';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import jwksRoutes from './routes/jwksRoutes';

const app = express();

const logger = container.get<ILogger>(TYPES.Logger);

app.use(asyncContextMiddleware);
app.use(createHttpLoggerMiddleware(logger));
app.use(express.json());

// Public routes
app.use('/', jwksRoutes);
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.use(createErrorHandler(logger));

export default app;
