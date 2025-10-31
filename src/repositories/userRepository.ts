import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import User from '../models/user';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';

export interface IUserRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(userData: CreateUserDto): Promise<User>;
  updateUser(id: string, updates: UpdateUserDto): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
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
}
