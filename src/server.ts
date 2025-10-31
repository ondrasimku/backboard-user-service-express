import app from './app';
import config from './config/config';
import { initializeDatabase } from './config/initDatabase';
import container from './config/container';
import { IEventPublisher } from './events/eventPublisher';
import { ILogger } from './logging/logger.interface';
import { TYPES } from './types/di.types';

const startServer = async () => {
  const logger = container.get<ILogger>(TYPES.Logger);

  try {
    logger.info('Starting user service', { environment: config.nodeEnv, port: config.port });
    
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    const eventPublisher = container.get<IEventPublisher>(TYPES.EventPublisher);
    
    try {
      await eventPublisher.connect();
      logger.info('Event publisher connected successfully');
    } catch (error) {
      logger.warn('Failed to connect to RabbitMQ. Server will continue without event publishing', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    app.listen(config.port, () => {
      logger.info('Server started successfully', { port: config.port });
    });
  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
};

startServer();
