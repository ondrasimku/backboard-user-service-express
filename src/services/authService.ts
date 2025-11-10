import { injectable, inject } from 'inversify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUserRepository } from '../repositories/userRepository';
import { RegisterDto, LoginDto, AuthResponseDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';
import config from '../config/config';
import { AppError } from '../middlewares/errorHandler';
import { IUserEventsPublisher } from '../events/userEventsPublisher';
import { ILogger } from '../logging/logger.interface';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  verifyEmail(token: string): Promise<{ success: boolean; message: string }>;
}

@injectable()
export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.UserEventsPublisher) private userEventsPublisher: IUserEventsPublisher,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    this.logger.info('User registration attempt', { email });

    const existingUser = await this.userRepository.findUserByEmail(email);
    if (existingUser) {
      this.logger.warn('Registration failed: email already exists', { email });
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const emailVerificationToken = this.generateEmailVerificationToken();

    const user = await this.userRepository.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user',
      emailVerificationToken,
    });

    await this.userEventsPublisher.onUserRegistered(user);

    this.logger.info('User registered successfully', { userId: user.id, email: user.email });

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

    this.logger.info('User login attempt', { email });

    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      this.logger.warn('Login failed: user not found', { email });
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Login failed: invalid password', { email, userId: user.id });
      throw new AppError('Invalid credentials', 401);
    }

    this.logger.info('User logged in successfully', { userId: user.id, email: user.email });

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

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    this.logger.info('Email verification attempt', { token });

    const user = await this.userRepository.findUserByVerificationToken(token);
    
    if (!user) {
      this.logger.warn('Email verification failed: invalid token');
      throw new AppError('Invalid verification token', 400);
    }

    if (user.emailVerified) {
      this.logger.info('Email already verified', { userId: user.id, email: user.email });
      return { success: true, message: 'Email already verified' };
    }

    await this.userRepository.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
    });

    this.logger.info('Email verified successfully', { userId: user.id, email: user.email });

    return { success: true, message: 'Email verified successfully' };
  }

  private generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

