import { injectable, inject } from 'inversify';
import User from '../models/user';
import { IUserRepository, PaginatedResult } from '../repositories/userRepository';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PaginationParams } from '../dto/pagination.dto';
import { UpdateUserProfileDto } from '../dto/user.dto';

export interface IUserService {
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  getPaginatedUsers(pagination: PaginationParams): Promise<PaginatedResult<User>>;
  updateUserProfile(userId: string, profileData: UpdateUserProfileDto): Promise<User | null>;
  setUserAvatar(userId: string, fileId: string, avatarUrl: string): Promise<User | null>;
  getUserMetrics(): Promise<{ userCount: number }>;
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

  async updateUserProfile(userId: string, profileData: UpdateUserProfileDto): Promise<User | null> {
    this.logger.debug('Updating user profile', { userId, profileData });
    
    const updateData: { firstName?: string; lastName?: string } = {};
    
    if (profileData.firstName !== undefined) {
      updateData.firstName = profileData.firstName;
    }
    
    if (profileData.lastName !== undefined) {
      updateData.lastName = profileData.lastName;
    }
    
    const updatedUser = await this.userRepository.updateUser(userId, updateData);
    
    if (!updatedUser) {
      this.logger.warn('User not found for profile update', { userId });
      return null;
    }
    
    this.logger.info('User profile updated successfully', { userId });
    return updatedUser;
  }

  async setUserAvatar(userId: string, fileId: string, avatarUrl: string): Promise<User | null> {
    this.logger.debug('Setting user avatar', { userId, fileId, avatarUrl });

    if (!fileId || fileId.trim().length === 0) {
      throw new Error('fileId is required and cannot be empty');
    }

    if (!avatarUrl || avatarUrl.trim().length === 0) {
      throw new Error('avatarUrl is required and cannot be empty');
    }

    try {
      new URL(avatarUrl);
    } catch {
      throw new Error('avatarUrl must be a valid URL');
    }

    const updatedUser = await this.userRepository.updateUser(userId, {
      avatarFileId: fileId,
      avatarUrl: avatarUrl,
    });

    if (!updatedUser) {
      this.logger.warn('User not found for avatar update', { userId });
      return null;
    }

    this.logger.info('User avatar updated successfully', { userId });
    return updatedUser;
  }

  async getUserMetrics(): Promise<{ userCount: number }> {
    this.logger.debug('Fetching user metrics');
    const userCount = await this.userRepository.getUserCount();
    this.logger.info('Retrieved user metrics', { userCount });
    return { userCount };
  }
}
