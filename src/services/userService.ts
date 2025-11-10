import { injectable, inject } from 'inversify';
import User from '../models/user';
import { IUserRepository, PaginatedResult } from '../repositories/userRepository';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PaginationParams } from '../dto/pagination.dto';

export interface IUserService {
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  getPaginatedUsers(pagination: PaginationParams): Promise<PaginatedResult<User>>;
}

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    this.logger.debug('Fetching user by ID', { userId: id });
    const user = await this.userRepository.findUserById(id);
    
    if (!user) {
      this.logger.warn('User not found', { userId: id });
    }
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    this.logger.debug('Fetching all users');
    const users = await this.userRepository.getAllUsers();
    this.logger.info('Retrieved users list', { count: users.length });
    return users;
  }

  async getPaginatedUsers(pagination: PaginationParams): Promise<PaginatedResult<User>> {
    this.logger.debug('Fetching paginated users', { pagination });
    const result = await this.userRepository.getPaginatedUsers(pagination);
    this.logger.info('Retrieved paginated users', {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
    });
    return result;
  }
}
