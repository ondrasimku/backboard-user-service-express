import { injectable, inject } from 'inversify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUserRepository } from '../repositories/userRepository';
import { RegisterDto, LoginDto, AuthResponseDto, RequestPasswordResetDto, ResetPasswordDto, ChangePasswordDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';
import config from '../config/config';
import { AppError } from '../middlewares/errorHandler';
import { IUserEventsPublisher } from '../events/userEventsPublisher';
import { ILogger } from '../logging/logger.interface';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  verifyEmail(token: string): Promise<{ success: boolean; message: string }>;
  requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<{ success: boolean; message: string }>;
  verifyPasswordResetToken(token: string): Promise<{ success: boolean; message: string }>;
  resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }>;
  changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ success: boolean; message: string }>;
}

@injectable()
export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

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

  private generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<{ success: boolean; message: string }> {
    const { email } = requestPasswordResetDto;

    this.logger.info('Password reset requested', { email });

    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      this.logger.warn('Password reset requested for non-existent user', { email });
      return { success: true, message: 'If the email exists, a password reset link has been sent' };
    }

    const passwordResetToken = this.generatePasswordResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

    await this.userRepository.updateUser(user.id, {
      passwordResetToken,
      passwordResetTokenExpiresAt: expiresAt,
    });

    const updatedUser = await this.userRepository.findUserById(user.id);
    if (updatedUser) {
      await this.userEventsPublisher.onPasswordResetRequested(updatedUser, passwordResetToken);
    }

    this.logger.info('Password reset token generated', { userId: user.id, email: user.email });

    return { success: true, message: 'If the email exists, a password reset link has been sent' };
  }

  async verifyPasswordResetToken(token: string): Promise<{ success: boolean; message: string }> {
    this.logger.info('Password reset token verification attempt', { token });

    const user = await this.userRepository.findUserByPasswordResetToken(token);
    
    if (!user || !user.passwordResetTokenExpiresAt) {
      this.logger.warn('Password reset token verification failed: invalid token');
      return { success: false, message: 'Password reset token is invalid' };
    }

    if (new Date() > user.passwordResetTokenExpiresAt) {
      this.logger.warn('Password reset token verification failed: token expired', { userId: user.id });
      return { success: false, message: 'Password reset token is expired' };
    }

    this.logger.info('Password reset token verified', { userId: user.id, email: user.email });

    return { success: true, message: 'Password reset token is valid' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const { token, newPassword } = resetPasswordDto;

    this.logger.info('Password reset attempt', { token });

    const user = await this.userRepository.findUserByPasswordResetToken(token);
    
    if (!user || !user.passwordResetTokenExpiresAt) {
      this.logger.warn('Password reset failed: invalid token');
      throw new AppError('Invalid or expired password reset token', 400);
    }

    if (new Date() > user.passwordResetTokenExpiresAt) {
      this.logger.warn('Password reset failed: token expired', { userId: user.id });
      throw new AppError('Invalid or expired password reset token', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.userRepository.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    });

    this.logger.info('Password reset successfully', { userId: user.id, email: user.email });

    return { success: true, message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    this.logger.info('Password change attempt', { userId });

    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      this.logger.warn('Password change failed: user not found', { userId });
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Password change failed: invalid current password', { userId });
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.userRepository.updateUser(user.id, {
      password: hashedPassword,
    });

    this.logger.info('Password changed successfully', { userId, email: user.email });

    return { success: true, message: 'Password has been changed successfully' };
  }
}

