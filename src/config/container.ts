import 'reflect-metadata';
import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PinoLoggerService } from '../logging/pino.logger';
import { IUserRepository, UserRepository } from '../repositories/userRepository';
import { IUserService, UserService } from '../services/userService';
import { IAuthService, AuthService } from '../services/authService';
import { IHealthService, HealthService } from '../services/healthService';
import { UserController } from '../controllers/userController';
import { AuthController } from '../controllers/authController';
import { HealthController } from '../controllers/healthController';
import { IEventPublisher } from '../events/eventPublisher';
import { RabbitMQEventPublisher } from '../events/rabbitmqEventPublisher';
import { IUserEventsPublisher, UserEventsPublisher } from '../events/userEventsPublisher';
import AppDataSource from './database';

const container = new Container();

container.bind<DataSource>(TYPES.DataSource).toConstantValue(AppDataSource);
container.bind<ILogger>(TYPES.Logger).to(PinoLoggerService).inSingletonScope();
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
container.bind<IUserService>(TYPES.UserService).to(UserService);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);
container.bind<IHealthService>(TYPES.HealthService).to(HealthService);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<AuthController>(TYPES.AuthController).to(AuthController);
container.bind<HealthController>(TYPES.HealthController).to(HealthController);
container.bind<IEventPublisher>(TYPES.EventPublisher).to(RabbitMQEventPublisher).inSingletonScope();
container.bind<IUserEventsPublisher>(TYPES.UserEventsPublisher).to(UserEventsPublisher);

export default container;

