import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import User from '../models/user';
import { Role } from '../models/role';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { PaginationParams } from '../dto/pagination.dto';
import { TYPES } from '../types/di.types';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IUserRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  findUserByGoogleId(googleId: string): Promise<User | null>;
  findUserByVerificationToken(token: string): Promise<User | null>;
  findUserByPasswordResetToken(token: string): Promise<User | null>;
  createUser(userData: CreateUserDto): Promise<User>;
  updateUser(id: string, updates: UpdateUserDto): Promise<User | null>;
  getAllUsers(orgId?: string | null): Promise<User[]>;
  getPaginatedUsers(pagination: PaginationParams, orgId?: string | null): Promise<PaginatedResult<User>>;
  getUserCount(orgId?: string | null): Promise<number>;
  findUserWithRoles(id: string): Promise<User | null>;
  addRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
}

@injectable()
export class UserRepository implements IUserRepository {
  private repository: Repository<User>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(User);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.repository.findOne({ 
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return await this.repository.findOne({ where: { googleId } });
  }

  async findUserByVerificationToken(token: string): Promise<User | null> {
    return await this.repository.findOne({ where: { emailVerificationToken: token } });
  }

  async findUserByPasswordResetToken(token: string): Promise<User | null> {
    return await this.repository.findOne({ where: { passwordResetToken: token } });
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async updateUser(id: string, updates: UpdateUserDto): Promise<User | null> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) return null;

    Object.assign(user, updates);
    return await this.repository.save(user);
  }

  async getAllUsers(orgId?: string | null): Promise<User[]> {
    if (orgId) {
      return await this.repository.find({ 
        where: { organizationId: orgId },
        relations: ['roles', 'roles.permissions'],
      });
    }
    return await this.repository.find({
      relations: ['roles', 'roles.permissions'],
    });
  }

  async getPaginatedUsers(pagination: PaginationParams, orgId?: string | null): Promise<PaginatedResult<User>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = orgId ? { organizationId: orgId } : {};

    const [data, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['roles', 'roles.permissions'],
    });

    return { data, total };
  }

  async getUserCount(orgId?: string | null): Promise<number> {
    if (orgId) {
      return await this.repository.count({ where: { organizationId: orgId } });
    }
    return await this.repository.count();
  }

  async findUserWithRoles(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async addRoleToUser(userId: string, roleId: string): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    const roleRepository = this.repository.manager.getRepository(Role);
    const role = await roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw new Error('Role not found');
    }

    if (!user.roles) {
      user.roles = [];
    }

    if (!user.roles.some(r => r.id === roleId)) {
      user.roles.push(role);
      await this.repository.save(user);
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user || !user.roles) {
      return;
    }

    user.roles = user.roles.filter(r => r.id !== roleId);
    await this.repository.save(user);
  }
}
