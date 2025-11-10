import { injectable, inject } from 'inversify';
import { IEventPublisher } from './eventPublisher';
import { TYPES } from '../types/di.types';
import User from '../models/user';

export interface IUserEventsPublisher {
  onUserRegistered(user: User): Promise<void>;
  onPasswordResetRequested(user: User, token: string): Promise<void>;
}

@injectable()
export class UserEventsPublisher implements IUserEventsPublisher {
  constructor(
    @inject(TYPES.EventPublisher) private eventPublisher: IEventPublisher,
  ) {}

  async onUserRegistered(user: User): Promise<void> {
    await this.eventPublisher.publish('user.registered', {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    });
  }

  async onPasswordResetRequested(user: User, token: string): Promise<void> {
    await this.eventPublisher.publish('user.password-change-requested', {
      userId: user.id,
      email: user.email,
      token,
      expiresAt: user.passwordResetTokenExpiresAt,
    });
  }
}

