import { injectable } from 'inversify';
import { Repository } from 'typeorm';
import AppDataSource from '../config/database';
import User from '../models/user';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

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

  constructor() {
    this.repository = AppDataSource.getRepository(User);
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
