import AppDataSource from './database';
import { ILogger } from '../logging/logger.interface';

export const initializeDatabase = async (logger: ILogger): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database', error as Error);
    throw error;
  }
};
