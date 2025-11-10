import 'reflect-metadata';
import request from 'supertest';
import { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import { createTestDataSource, cleanDatabase, closeTestDataSource } from '../helpers/testDatabase';
import { createTestApp } from '../helpers/testApp';
import { RegisterDto } from '../../src/dto/user.dto';
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from '../helpers/testKeys';

describe('UserController Integration Tests', () => {
  let dataSource: DataSource;
  let app: any;
  let authToken: string;
  let userId: string;

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

    const registerDto: RegisterDto = {
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(registerDto);

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('GET /api/users/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body.firstName).toBe('Test');
      expect(response.body.lastName).toBe('User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.message).toContain('Missing or invalid token');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'testuser@example.com' },
        TEST_JWT_PRIVATE_KEY,
        { algorithm: 'RS256', expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/users/${userId}`)
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      const users = [
        { email: 'user1@example.com', password: 'Pass1!', firstName: 'User', lastName: 'One' },
        { email: 'user2@example.com', password: 'Pass2!', firstName: 'User', lastName: 'Two' },
        { email: 'user3@example.com', password: 'Pass3!', firstName: 'User', lastName: 'Three' },
      ];

      for (const user of users) {
        await request(app).post('/api/auth/register').send(user);
      }
    });

    it('should return paginated users with default pagination', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('should return paginated users with custom pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
      expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should return second page of users', async () => {
      const response = await request(app)
        .get('/api/users?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.limit).toBe(2);
    });

    it('should return 400 for invalid page number', async () => {
      const response = await request(app)
        .get('/api/users?page=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Page must be greater than 0');
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/users?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Limit must be between 1 and 100');
    });

    it('should not include password in response', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update user first name', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'UpdatedFirst' })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedFirst');
      expect(response.body.lastName).toBe('User');
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should update user last name', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lastName: 'UpdatedLast' })
        .expect(200);

      expect(response.body.firstName).toBe('Test');
      expect(response.body.lastName).toBe('UpdatedLast');
      expect(response.body.email).toBe('testuser@example.com');
    });

    it('should update both first and last name', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'NewFirst', lastName: 'NewLast' })
        .expect(200);

      expect(response.body.firstName).toBe('NewFirst');
      expect(response.body.lastName).toBe('NewLast');
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('At least one field');
    });

    it('should return 400 when firstName is empty string', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: '   ' })
        .expect(400);

      expect(response.body.message).toContain('firstName cannot be empty');
    });

    it('should return 400 when lastName is empty string', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lastName: '' })
        .expect(400);

      expect(response.body.message).toContain('lastName cannot be empty');
    });

    it('should return 400 when firstName is not a string', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 123 })
        .expect(400);

      expect(response.body.message).toContain('firstName must be a string');
    });

    it('should return 400 when lastName is not a string', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lastName: { name: 'test' } })
        .expect(400);

      expect(response.body.message).toContain('lastName must be a string');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(response.body.message).toContain('Missing or invalid token');
    });

    it('should not update other user fields', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          firstName: 'NewName',
          email: 'hacker@example.com',
          role: 'admin'
        })
        .expect(200);

      expect(response.body.firstName).toBe('NewName');
      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body.role).not.toBe('admin');
    });

    it('should persist changes across multiple requests', async () => {
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'PersistentName' })
        .expect(200);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.firstName).toBe('PersistentName');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', authToken)
        .expect(401);

      expect(response.body.message).toContain('Missing or invalid token');
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.message).toContain('Missing or invalid token');
    });

    it('should reject token signed with wrong key', async () => {
      const wrongToken = jwt.sign(
        { userId, email: 'testuser@example.com' },
        'wrong-private-key',
        { algorithm: 'HS256' }
      );

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });
  });
});

