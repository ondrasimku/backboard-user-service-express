import 'reflect-metadata';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestDataSource, cleanDatabase, closeTestDataSource } from '../helpers/testDatabase';
import { createTestApp } from '../helpers/testApp';
import { RegisterDto, LoginDto } from '../../src/dto/user.dto';
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from '../helpers/testKeys';

describe('AuthController Integration Tests', () => {
  let dataSource: DataSource;
  let app: any;

  beforeAll(async () => {
    process.env.JWT_PRIVATE_KEY = TEST_JWT_PRIVATE_KEY;
    process.env.JWT_PUBLIC_KEY = TEST_JWT_PUBLIC_KEY;

    dataSource = await createTestDataSource();
    const testApp = createTestApp(dataSource);
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestDataSource(dataSource);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.firstName).toBe(registerDto.firstName);
      expect(response.body.user.lastName).toBe(registerDto.lastName);
      expect(response.body.user.emailVerified).toBe(false);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 when email is missing', async () => {
      const invalidDto = {
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('required');
    });

    it('should return 400 when trying to register with existing email', async () => {
      const registerDto: RegisterDto = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app).post('/api/auth/register').send(registerDto).expect(201);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should hash password before storing', async () => {
      const registerDto: RegisterDto = {
        email: 'hashtest@example.com',
        password: 'PlainPassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app).post('/api/auth/register').send(registerDto).expect(201);

      const userRepository = dataSource.getRepository('users');
      const user = await userRepository.findOne({ where: { email: 'hashtest@example.com' } });

      expect(user).toBeDefined();
      expect(user!.password).not.toBe('PlainPassword123');
      expect(user!.password).toMatch(/^\$2[aby]\$\d{2}\$/);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const registerDto: RegisterDto = {
        email: 'logintest@example.com',
        password: 'TestPassword123!',
        firstName: 'Login',
        lastName: 'Test',
      };

      await request(app).post('/api/auth/register').send(registerDto);
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'logintest@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginDto.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 with invalid password', async () => {
      const loginDto: LoginDto = {
        email: 'logintest@example.com',
        password: 'WrongPassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 with non-existent email', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 400 when email or password is missing', async () => {
      const invalidDto = {
        email: 'test@example.com',
      };

      await request(app)
        .post('/api/auth/login')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    let verificationToken: string;

    beforeEach(async () => {
      await cleanDatabase(dataSource);
      const userRepo = dataSource.getRepository('users');
      const registerDto: RegisterDto = {
        email: 'verify@example.com',
        password: 'TestPassword123!',
        firstName: 'Verify',
        lastName: 'Test',
      };

      const response = await request(app).post('/api/auth/register').send(registerDto);

      const user = await userRepo.findOne({ where: { email: 'verify@example.com' } });
      if (!user) {
        throw new Error('User not found after registration');
      }
      verificationToken = user.emailVerificationToken!;
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .get(`/api/auth/verify/${verificationToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');

      const userRepo = dataSource.getRepository('users');
      const user = await userRepo.findOne({ where: { email: 'verify@example.com' } });
      expect(user).toBeDefined();
      expect(user!.emailVerified).toBe(true);
      expect(user!.emailVerificationToken).toBeNull();
    });

    it('should return 400 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify/invalid-token-123')
        .expect(400);

      expect(response.body.message).toContain('Invalid verification token');
    });

    it('should handle already verified email', async () => {
      await request(app).get(`/api/auth/verify/${verificationToken}`).expect(200);

      const response = await request(app)
        .get(`/api/auth/verify/${verificationToken}`)
        .expect(400);

      expect(response.body.message).toContain('Invalid verification token');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let authToken: string;
    const testPassword = 'TestPassword123!';
    const newPassword = 'NewSecurePassword456!';

    beforeEach(async () => {
      const registerDto: RegisterDto = {
        email: 'changepassword@example.com',
        password: testPassword,
        firstName: 'Change',
        lastName: 'Password',
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerDto);

      authToken = registerResponse.body.token;
    });

    it('should change password successfully with valid credentials', async () => {
      const changePasswordDto = {
        currentPassword: testPassword,
        newPassword: newPassword,
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('changed successfully');

      const loginDto: LoginDto = {
        email: 'changepassword@example.com',
        password: newPassword,
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should return 401 when current password is incorrect', async () => {
      const changePasswordDto = {
        currentPassword: 'WrongPassword123!',
        newPassword: newPassword,
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordDto)
        .expect(401);

      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should return 401 when no auth token is provided', async () => {
      const changePasswordDto = {
        currentPassword: testPassword,
        newPassword: newPassword,
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .send(changePasswordDto)
        .expect(401);

      expect(response.body.message).toContain('token');
    });

    it('should return 400 when current password is missing', async () => {
      const changePasswordDto = {
        newPassword: newPassword,
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordDto)
        .expect(400);

      expect(response.body.message).toContain('required');
    });

    it('should return 400 when new password is missing', async () => {
      const changePasswordDto = {
        currentPassword: testPassword,
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordDto)
        .expect(400);

      expect(response.body.message).toContain('required');
    });

    it('should not allow login with old password after change', async () => {
      const changePasswordDto = {
        currentPassword: testPassword,
        newPassword: newPassword,
      };

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordDto)
        .expect(200);

      const loginDto: LoginDto = {
        email: 'changepassword@example.com',
        password: testPassword,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });
});

