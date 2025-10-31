import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PinoLoggerService } from '../logging/pino.logger';
import { IUserRepository, UserRepository } from '../repositories/userRepository';
import { IUserService, UserService } from '../services/userService';
import { IAuthService, AuthService } from '../services/authService';
import { UserController } from '../controllers/userController';
import { AuthController } from '../controllers/authController';
import { IEventPublisher } from '../events/eventPublisher';
import { RabbitMQEventPublisher } from '../events/rabbitmqEventPublisher';
import { IUserEventsPublisher, UserEventsPublisher } from '../events/userEventsPublisher';

const container = new Container();

container.bind<ILogger>(TYPES.Logger).to(PinoLoggerService).inSingletonScope();
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
container.bind<IUserService>(TYPES.UserService).to(UserService);
container.bind<IAuthService>(TYPES.AuthService).to(AuthService);
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<AuthController>(TYPES.AuthController).to(AuthController);
container.bind<IEventPublisher>(TYPES.EventPublisher).to(RabbitMQEventPublisher).inSingletonScope();
container.bind<IUserEventsPublisher>(TYPES.UserEventsPublisher).to(UserEventsPublisher);

export default container;

