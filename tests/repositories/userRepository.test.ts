import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../src/repositories/userRepository';
import { createTestDataSource, cleanDatabase, closeTestDataSource } from '../helpers/testDatabase';
import { CreateUserDto, UpdateUserDto } from '../../src/dto/user.dto';

describe('UserRepository Integration Tests', () => {
  let dataSource: DataSource;
  let userRepository: UserRepository;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    userRepository = new UserRepository(dataSource);
  });

  afterAll(async () => {
    await closeTestDataSource(dataSource);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      };

      const user = await userRepository.createUser(createUserDto);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(createUserDto.email);
      expect(user.firstName).toBe(createUserDto.firstName);
      expect(user.lastName).toBe(createUserDto.lastName);
      expect(user.role).toBe(createUserDto.role);
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should create user with email verification token', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        emailVerificationToken: 'abc123token',
      };

      const user = await userRepository.createUser(createUserDto);

      expect(user.emailVerificationToken).toBe('abc123token');
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'find@example.com',
        password: 'hashedPassword123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      await userRepository.createUser(createUserDto);
      const foundUser = await userRepository.findUserByEmail('find@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('find@example.com');
      expect(foundUser?.firstName).toBe('Jane');
    });

    it('should return null when user not found', async () => {
      const foundUser = await userRepository.findUserByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      const createUserDto: CreateUserDto = {
        email: 'findbyid@example.com',
        password: 'hashedPassword123',
        firstName: 'Bob',
        lastName: 'Johnson',
      };

      const createdUser = await userRepository.createUser(createUserDto);
      const foundUser = await userRepository.findUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe('findbyid@example.com');
    });

    it('should return null when user id not found', async () => {
      const foundUser = await userRepository.findUserById('00000000-0000-0000-0000-000000000000');
      expect(foundUser).toBeNull();
    });
  });

  describe('findUserByVerificationToken', () => {
    it('should find user by verification token', async () => {
      const createUserDto: CreateUserDto = {
        email: 'verify@example.com',
        password: 'hashedPassword123',
        firstName: 'Alice',
        lastName: 'Brown',
        emailVerificationToken: 'unique-token-123',
      };

      await userRepository.createUser(createUserDto);
      const foundUser = await userRepository.findUserByVerificationToken('unique-token-123');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('verify@example.com');
      expect(foundUser?.emailVerificationToken).toBe('unique-token-123');
    });

    it('should return null when token not found', async () => {
      const foundUser = await userRepository.findUserByVerificationToken('nonexistent-token');
      expect(foundUser).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const createUserDto: CreateUserDto = {
        email: 'update@example.com',
        password: 'hashedPassword123',
        firstName: 'Original',
        lastName: 'Name',
      };

      const createdUser = await userRepository.createUser(createUserDto);

      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'NewName',
      };

      const updatedUser = await userRepository.updateUser(createdUser.id, updateDto);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.firstName).toBe('Updated');
      expect(updatedUser?.lastName).toBe('NewName');
      expect(updatedUser?.email).toBe('update@example.com');
    });

    it('should verify email and clear token', async () => {
      const createUserDto: CreateUserDto = {
        email: 'toverify@example.com',
        password: 'hashedPassword123',
        firstName: 'Test',
        lastName: 'User',
        emailVerificationToken: 'token-to-clear',
      };

      const createdUser = await userRepository.createUser(createUserDto);

      const updateDto: UpdateUserDto = {
        emailVerified: true,
        emailVerificationToken: null,
      };

      const updatedUser = await userRepository.updateUser(createdUser.id, updateDto);

      expect(updatedUser?.emailVerified).toBe(true);
      expect(updatedUser?.emailVerificationToken).toBeNull();
    });

    it('should return null when updating non-existent user', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
      };

      const result = await userRepository.updateUser('00000000-0000-0000-0000-000000000000', updateDto);
      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await cleanDatabase(dataSource);
    });

    it('should return all users', async () => {
      const users = [
        { email: 'user1@example.com', password: 'pass1', firstName: 'User', lastName: 'One' },
        { email: 'user2@example.com', password: 'pass2', firstName: 'User', lastName: 'Two' },
        { email: 'user3@example.com', password: 'pass3', firstName: 'User', lastName: 'Three' },
      ];

      for (const user of users) {
        await userRepository.createUser(user);
      }

      const allUsers = await userRepository.getAllUsers();

      expect(allUsers).toHaveLength(3);
      expect(allUsers.map(u => u.email)).toEqual(
        expect.arrayContaining(['user1@example.com', 'user2@example.com', 'user3@example.com'])
      );
    });

    it('should return empty array when no users exist', async () => {
      const allUsers = await userRepository.getAllUsers();
      expect(allUsers).toEqual([]);
    });
  });

  describe('getPaginatedUsers', () => {
    beforeEach(async () => {
      await cleanDatabase(dataSource);
      for (let i = 1; i <= 15; i++) {
        await userRepository.createUser({
          email: `user${i}@example.com`,
          password: `password${i}`,
          firstName: `User${i}`,
          lastName: `Test`,
        });
      }
    });

    it('should return first page of users', async () => {
      const result = await userRepository.getPaginatedUsers({ page: 1, limit: 5 });

      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(15);
    });

    it('should return second page of users', async () => {
      const result = await userRepository.getPaginatedUsers({ page: 2, limit: 5 });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.total).toBe(15);
    });

    it('should return last page with remaining users', async () => {
      const result = await userRepository.getPaginatedUsers({ page: 2, limit: 10 });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.total).toBe(15);
    });

    it('should return users ordered by createdAt DESC', async () => {
      const result = await userRepository.getPaginatedUsers({ page: 1, limit: 5 });

      const createdAtDates = result.data.map(u => u.createdAt.getTime());
      const sortedDates = [...createdAtDates].sort((a, b) => b - a);

      expect(createdAtDates).toEqual(sortedDates);
    });
  });
});

