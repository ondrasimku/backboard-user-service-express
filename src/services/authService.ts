import { injectable, inject } from 'inversify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUserRepository } from '../repositories/userRepository';
import { RegisterDto, LoginDto, AuthResponseDto, RequestPasswordResetDto, ResetPasswordDto, ChangePasswordDto, GoogleOAuthDto, GoogleOAuthResponseDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';
import config from '../config/config';
import { AppError } from '../middlewares/errorHandler';
import { IUserEventsPublisher } from '../events/userEventsPublisher';
import { ILogger } from '../logging/logger.interface';
import { IGoogleAuthService } from './googleAuthService';
import { IUserAuthService } from './userAuthService';
import User from '../models/user';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LoginDto): Promise<AuthResponseDto>;
  googleOAuth(googleOAuthDto: GoogleOAuthDto): Promise<GoogleOAuthResponseDto>;
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
    @inject(TYPES.GoogleAuthService) private googleAuthService: IGoogleAuthService,
    @inject(TYPES.UserAuthService) private userAuthService: IUserAuthService,
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
      emailVerificationToken,
    });

    await this.userEventsPublisher.onUserRegistered(user);

    this.logger.info('User registered successfully', { userId: user.id, email: user.email });

    const token = await this.generateToken(user.id);

    return {
      user: this.mapUserToDto(user),
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

    if (!user.password) {
      this.logger.warn('Login failed: user has no password (OAuth-only account)', { email, userId: user.id });
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn('Login failed: invalid password', { email, userId: user.id });
      throw new AppError('Invalid credentials', 401);
    }

    this.logger.info('User logged in successfully', { userId: user.id, email: user.email });

    const token = await this.generateToken(user.id);

    return {
      user: this.mapUserToDto(user),
      token,
    };
  }

  private async generateToken(userId: string): Promise<string> {
    if (!config.jwt.privateKey) {
      throw new Error('JWT private key not configured');
    }

    const authInfo = await this.userAuthService.resolveUserAuthInfo(userId);
    if (!authInfo) {
      throw new Error('User not found');
    }

    const now = Math.floor(Date.now() / 1000);
    
    let expiresInSeconds: number;
    if (config.jwt.expiresIn.endsWith('h')) {
      expiresInSeconds = parseInt(config.jwt.expiresIn) * 3600;
    } else if (config.jwt.expiresIn.endsWith('d')) {
      expiresInSeconds = parseInt(config.jwt.expiresIn) * 24 * 3600;
    } else if (config.jwt.expiresIn.endsWith('m')) {
      expiresInSeconds = parseInt(config.jwt.expiresIn) * 60;
    } else {
      expiresInSeconds = parseInt(config.jwt.expiresIn) || 3600;
    }

    const payload = {
      sub: authInfo.userId,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
      iat: now,
      exp: now + expiresInSeconds,
      nbf: now,
      org_id: authInfo.organizationId,
      roles: authInfo.roles,
      permissions: authInfo.permissions,
      email: authInfo.email,
      name: authInfo.name,
    };

    return jwt.sign(payload, config.jwt.privateKey, {
      algorithm: 'RS256',
    });
  }

  private mapUserToDto(user: User): AuthResponseDto['user'] {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      roles: (user.roles || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions?.map(p => p.name) || [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })),
      avatarUrl: user.avatarUrl,
      avatarFileId: user.avatarFileId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async googleOAuth(googleOAuthDto: GoogleOAuthDto): Promise<GoogleOAuthResponseDto> {
    const { idToken } = googleOAuthDto;

    this.logger.info('Google OAuth attempt');

    const googleUser = await this.googleAuthService.verifyIdToken(idToken);

    let user = await this.userRepository.findUserByGoogleId(googleUser.sub);

    if (user) {
      this.logger.info('Google OAuth: existing OAuth user login', { userId: user.id, email: user.email });
      const token = await this.generateToken(user.id);
      return {
        user: this.mapUserToDto(user),
        token,
        isNewUser: false,
        accountLinked: false,
      };
    }

    const existingUser = await this.userRepository.findUserByEmail(googleUser.email);

    if (existingUser) {
      this.logger.info('Google OAuth: linking to existing account', { userId: existingUser.id, email: existingUser.email });
      
      await this.userRepository.updateUser(existingUser.id, {
        googleId: googleUser.sub,
        authProvider: existingUser.authProvider === 'local' ? 'local' : 'google',
        emailVerified: true,
      });

      const updatedUser = await this.userRepository.findUserById(existingUser.id);
      if (!updatedUser) {
        throw new AppError('Failed to update user', 500);
      }

      const token = await this.generateToken(updatedUser.id);

      return {
        user: this.mapUserToDto(updatedUser),
        token,
        isNewUser: false,
        accountLinked: true,
      };
    }

    this.logger.info('Google OAuth: creating new user', { email: googleUser.email });

    const newUser = await this.userRepository.createUser({
      email: googleUser.email,
      password: null,
      firstName: googleUser.given_name || '',
      lastName: googleUser.family_name || '',
      googleId: googleUser.sub,
      authProvider: 'google',
      emailVerified: true,
    });

    await this.userEventsPublisher.onUserRegistered(newUser);

    this.logger.info('Google OAuth: user created successfully', { userId: newUser.id, email: newUser.email });

    const token = await this.generateToken(newUser.id);

    return {
      user: this.mapUserToDto(newUser),
      token,
      isNewUser: true,
      accountLinked: false,
    };
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

    if (!user.password) {
      this.logger.warn('Password change failed: user has no password (OAuth-only account)', { userId });
      throw new AppError('Cannot change password for OAuth-only account', 400);
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

