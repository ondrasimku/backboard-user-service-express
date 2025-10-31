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

const app = express();

const logger = container.get<ILogger>(TYPES.Logger);

app.use(asyncContextMiddleware);
app.use(createHttpLoggerMiddleware(logger));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use(createErrorHandler(logger));

export default app;
