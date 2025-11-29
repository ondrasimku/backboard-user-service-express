import { injectable, inject } from 'inversify';
import { IUserRepository } from '../repositories/userRepository';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import User from '../models/user';

export interface UserAuthInfo {
  userId: string;
  email: string;
  name: string;
  organizationId: string | null;
  roles: string[];
  permissions: string[];
}

export interface IUserAuthService {
  resolveUserAuthInfo(userId: string): Promise<UserAuthInfo | null>;
}

@injectable()
export class UserAuthService implements IUserAuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async resolveUserAuthInfo(userId: string): Promise<UserAuthInfo | null> {
    const user = await this.userRepository.findUserWithRoles(userId);
    
    if (!user) {
      return null;
    }

    const roles = user.roles?.map(role => role.name) || [];

    const permissionSet = new Set<string>();
    if (user.roles) {
      for (const role of user.roles) {
        if (role.permissions) {
          for (const permission of role.permissions) {
            permissionSet.add(permission.name);
          }
        }
      }
    }

    const permissions = Array.from(permissionSet);

    return {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      organizationId: user.organizationId,
      roles,
      permissions,
    };
  }
}

