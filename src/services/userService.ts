import { injectable, inject } from 'inversify';
import User from '../models/user';
import { IUserRepository } from '../repositories/userRepository';
import { TYPES } from '../types/di.types';

export interface IUserService {
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
}

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findUserById(id);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.getAllUsers();
  }
}
