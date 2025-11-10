import 'reflect-metadata';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/authService';
import { IUserRepository } from '../../src/repositories/userRepository';
import { IUserEventsPublisher } from '../../src/events/userEventsPublisher';
import { RegisterDto, LoginDto } from '../../src/dto/user.dto';
import { AppError } from '../../src/middlewares/errorHandler';
import { User } from '../../src/models/user';
import { createMockLogger } from '../helpers/mockLogger';
import { TEST_JWT_PRIVATE_KEY } from '../helpers/testKeys';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  randomBytes: jest.fn((size: number) => ({
    toString: jest.fn(() => 'mocked-token-123'),
  })),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockUserEventsPublisher: jest.Mocked<IUserEventsPublisher>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: false,
    emailVerificationToken: 'token123',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      findUserByVerificationToken: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      getAllUsers: jest.fn(),
      getPaginatedUsers: jest.fn(),
    };

    mockUserEventsPublisher = {
      onUserRegistered: jest.fn(),
    };

    mockLogger = createMockLogger();

    process.env.JWT_PRIVATE_KEY = TEST_JWT_PRIVATE_KEY;
    process.env.JWT_PUBLIC_KEY = 'public-key';

    authService = new AuthService(
      mockUserRepository,
      mockUserEventsPublisher,
      mockLogger
    );
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword123' as never);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('jwt-token' as never);

      const result = await authService.register(registerDto);

      expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'hashedPassword123',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user',
          emailVerificationToken: expect.any(String),
        })
      );
      expect(mockUserEventsPublisher.onUserRegistered).toHaveBeenCalledWith(mockUser);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBe('jwt-token');
    });

    it('should throw error when email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        new AppError('User with this email already exists', 400)
      );

      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
      expect(mockUserEventsPublisher.onUserRegistered).not.toHaveBeenCalled();
    });

    it('should hash password before storing', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'plainPassword',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPlainPassword' as never);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('jwt-token' as never);

      await authService.register(registerDto);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashedPlainPassword',
        })
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('jwt-token' as never);

      const result = await authService.login(loginDto);

      expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBe('jwt-token');
    });

    it('should throw error when user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error when password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const verificationToken = 'valid-token-123';
      const userToVerify = { ...mockUser, emailVerified: false, emailVerificationToken: verificationToken };

      mockUserRepository.findUserByVerificationToken.mockResolvedValue(userToVerify);
      mockUserRepository.updateUser.mockResolvedValue({ ...userToVerify, emailVerified: true, emailVerificationToken: null });

      const result = await authService.verifyEmail(verificationToken);

      expect(mockUserRepository.findUserByVerificationToken).toHaveBeenCalledWith(verificationToken);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userToVerify.id, {
        emailVerified: true,
        emailVerificationToken: null,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
    });

    it('should throw error with invalid token', async () => {
      mockUserRepository.findUserByVerificationToken.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
        new AppError('Invalid verification token', 400)
      );

      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it('should handle already verified email', async () => {
      const verificationToken = 'valid-token-123';
      const verifiedUser = { ...mockUser, emailVerified: true };

      mockUserRepository.findUserByVerificationToken.mockResolvedValue(verifiedUser);

      const result = await authService.verifyEmail(verificationToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email already verified');
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('token generation', () => {
    it('should generate JWT token with correct payload', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('jwt-token' as never);

      await authService.register(registerDto);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
        },
        expect.any(String),
        {
          algorithm: 'RS256',
          expiresIn: '7d',
        }
      );
    });
  });
});

