import { injectable, inject } from 'inversify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../repositories/userRepository';
import { RegisterDto, LoginDto, AuthResponseDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';
import config from '../config/config';
import { AppError } from '../middlewares/errorHandler';
import { IUserEventsPublisher } from '../events/userEventsPublisher';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
}

@injectable()
export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.UserEventsPublisher) private userEventsPublisher: IUserEventsPublisher,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.userRepository.findUserByEmail(email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await this.userRepository.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user',
    });

    await this.userEventsPublisher.onUserRegistered(user);

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    if (!config.jwt.privateKey) {
      throw new Error('JWT private key not configured');
    }

    const payload = {
      userId,
      email,
    };

    return jwt.sign(payload, config.jwt.privateKey, {
      algorithm: 'RS256',
      expiresIn: '7d',
    });
  }
}

