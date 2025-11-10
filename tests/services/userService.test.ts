import 'reflect-metadata';
import { UserService } from '../../src/services/userService';
import { IUserRepository } from '../../src/repositories/userRepository';
import { User } from '../../src/models/user';
import { createMockLogger } from '../helpers/mockLogger';
import { PaginationParams } from '../../src/dto/pagination.dto';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    emailVerified: false,
    emailVerificationToken: null,
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

    mockLogger = createMockLogger();

    userService = new UserService(mockUserRepository, mockLogger);
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findUserById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Fetching user by ID',
        { userId: '123e4567-e89b-12d3-a456-426614174000' }
      );
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent-id');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('User not found', { userId: 'nonexistent-id' });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'user2@example.com' },
        { ...mockUser, id: 'user-3', email: 'user3@example.com' },
      ];

      mockUserRepository.getAllUsers.mockResolvedValue(mockUsers as User[]);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(3);
      expect(mockUserRepository.getAllUsers).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Fetching all users');
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved users list', { count: 3 });
    });

    it('should return empty array when no users exist', async () => {
      mockUserRepository.getAllUsers.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved users list', { count: 0 });
    });
  });

  describe('getPaginatedUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'user2@example.com' },
        { ...mockUser, id: 'user-3', email: 'user3@example.com' },
      ];

      const paginationParams: PaginationParams = { page: 1, limit: 10 };

      mockUserRepository.getPaginatedUsers.mockResolvedValue({
        data: mockUsers as User[],
        total: 3,
      });

      const result = await userService.getPaginatedUsers(paginationParams);

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(3);
      expect(mockUserRepository.getPaginatedUsers).toHaveBeenCalledWith(paginationParams);
      expect(mockLogger.debug).toHaveBeenCalledWith('Fetching paginated users', {
        pagination: paginationParams,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Retrieved paginated users', {
        page: 1,
        limit: 10,
        total: 3,
      });
    });

    it('should handle different pagination parameters', async () => {
      const paginationParams: PaginationParams = { page: 2, limit: 5 };

      mockUserRepository.getPaginatedUsers.mockResolvedValue({
        data: [mockUser] as User[],
        total: 15,
      });

      const result = await userService.getPaginatedUsers(paginationParams);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(15);
      expect(mockUserRepository.getPaginatedUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
      });
    });

    it('should return empty data with zero total when no users', async () => {
      const paginationParams: PaginationParams = { page: 1, limit: 10 };

      mockUserRepository.getPaginatedUsers.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await userService.getPaginatedUsers(paginationParams);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

