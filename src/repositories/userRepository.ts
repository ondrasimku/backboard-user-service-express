import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import User from '../models/user';
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
  getAllUsers(): Promise<User[]>;
  getPaginatedUsers(pagination: PaginationParams): Promise<PaginatedResult<User>>;
  getUserCount(): Promise<number>;
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
    return await this.repository.findOne({ where: { id } });
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

  async getAllUsers(): Promise<User[]> {
    return await this.repository.find();
  }

  async getPaginatedUsers(pagination: PaginationParams): Promise<PaginatedResult<User>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async getUserCount(): Promise<number> {
    return await this.repository.count();
  }
}
