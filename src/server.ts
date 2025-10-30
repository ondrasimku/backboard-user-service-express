import app from './app';
import config from './config/config';
import { initializeDatabase } from './config/initDatabase';
import container from './config/container';
import { IEventPublisher } from './events/eventPublisher';
import { TYPES } from './types/di.types';

const startServer = async () => {
  try {
    await initializeDatabase();
    
    const eventPublisher = container.get<IEventPublisher>(TYPES.EventPublisher);
    
    try {
      await eventPublisher.connect();
    } catch (error) {
      console.warn('Failed to connect to RabbitMQ. Server will continue without event publishing:', error);
    }
    
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
