import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { UserRole } from '../src/common/enums/user-role.enum';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { Blog } from '../src/modules/blogs/schemas/blog.schema';
import { User } from '../src/modules/users/schemas/user.schema';

const USER_ID = '652f1c2b8f1b2c0012345678';
const BLOG_ID = '652f1c2b8f1b2c00abcdef01';

/** Stands in for a Mongoose `Query`, covering the chained calls the services make. */
const query = <T>(value: T) => ({
  exec: jest.fn().mockResolvedValue(value),
  select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
  sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
});

/**
 * Drives the real HTTP stack - global prefix, guards, ValidationPipe and the error
 * filter - with only the Mongoose models replaced. What these tests assert is what a
 * browser would actually receive.
 */
describe('Blog API (e2e)', () => {
  let app: INestApplication<App>;
  let userModel: Record<string, jest.Mock>;
  let blogModel: Record<string, jest.Mock>;

  const buildUser = (role: UserRole, passwordHash: string) => ({
    _id: USER_ID,
    email: 'ada@example.com',
    userName: 'Ada',
    phoneNumber: '9876543210',
    profilepic: '',
    password: passwordHash,
    role,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  /** Logs in as `role` and returns a real bearer token signed by the running app. */
  const tokenFor = async (role: UserRole): Promise<string> => {
    const hash = await bcrypt.hash('super-secret', 10);
    userModel.findOne.mockReturnValue(query(buildUser(role, hash)));

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ada@example.com', password: 'super-secret' })
      .expect(200);

    // Authenticated requests then resolve the token's id through findById.
    userModel.findById.mockReturnValue(query(buildUser(role, hash)));

    return (response.body as { data: { token: string } }).data.token;
  };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    blogModel = {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getConnectionToken())
      .useValue({ close: jest.fn() })
      .overrideProvider(getModelToken(User.name))
      .useValue(userModel)
      .overrideProvider(getModelToken(Blog.name))
      .useValue(blogModel)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a user and reports the outcome under `status`', async () => {
      userModel.findOne.mockReturnValue(query(null));
      userModel.create.mockResolvedValue(buildUser(UserRole.USER, 'hash'));

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'ada@example.com',
          userName: 'Ada',
          phoneNumber: '9876543210',
          password: 'super-secret',
        })
        .expect(200);

      expect(response.body).toEqual({ message: 'User added successfully', status: true });
    });

    it('rejects an invalid body with the shared error envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', userName: '', phoneNumber: '1', password: 'short' })
        .expect(400);

      expect(response.body).toMatchObject({ success: false, status: false });
      expect((response.body as { message: string }).message).toContain('email');
    });

    it('strips a client-supplied field that no DTO declares', async () => {
      userModel.findOne.mockReturnValue(query(null));
      userModel.create.mockResolvedValue(buildUser(UserRole.USER, 'hash'));

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'ada@example.com',
          userName: 'Ada',
          phoneNumber: '9876543210',
          password: 'super-secret',
          isSuperAdmin: true,
        })
        .expect(200);

      const [created] = userModel.create.mock.calls as [[Record<string, unknown>]];
      expect(created[0]).not.toHaveProperty('isSuperAdmin');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns the user plus a token and never the password hash', async () => {
      const hash = await bcrypt.hash('super-secret', 10);
      userModel.findOne.mockReturnValue(query(buildUser(UserRole.USER, hash)));

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ada@example.com', password: 'super-secret' })
        .expect(200);

      const body = response.body as { success: boolean; data: Record<string, unknown> };
      expect(body.success).toBe(true);
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).toMatchObject({ _id: USER_ID, email: 'ada@example.com', role: 'user' });
      expect(body.data.token).toEqual(expect.any(String));
    });
  });

  describe('GET /api/v1/blog/getallblog', () => {
    it('is public and returns blogs under `blogs`', async () => {
      blogModel.find.mockReturnValue(query([{ _id: BLOG_ID, title: 'Hello' }]));

      const response = await request(app.getHttpServer())
        .get('/api/v1/blog/getallblog')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        blogs: [{ _id: BLOG_ID, title: 'Hello' }],
      });
    });
  });

  describe('authorisation', () => {
    it('rejects a protected route with no token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/blog/create')
        .send({ title: 'T', topic: 'x', content: 'c', image: 'https://img.test/a.png' })
        .expect(401);

      expect(response.body).toMatchObject({ success: false });
    });

    it('rejects a token whose role is not allowed', async () => {
      const token = await tokenFor(UserRole.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/v1/blog/create')
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'T', topic: 'x', content: 'c', image: 'https://img.test/a.png' })
        .expect(403);

      expect((response.body as { message: string }).message).toContain('permission');
    });

    it('accepts an allowed role and stamps the author onto the blog', async () => {
      const token = await tokenFor(UserRole.USER);
      blogModel.create.mockResolvedValue({ _id: BLOG_ID });

      const response = await request(app.getHttpServer())
        .post('/api/v1/blog/create')
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'T', topic: 'x', content: 'c', image: 'https://img.test/a.png' })
        .expect(201);

      expect(response.body).toEqual({ message: 'Blog Created Successfully!', success: true });

      const [created] = blogModel.create.mock.calls as [[Record<string, unknown>]];
      expect(created[0]).toMatchObject({ user: { id: USER_ID, name: 'Ada' } });
    });

    it('lets an admin list users', async () => {
      const token = await tokenFor(UserRole.ADMIN);
      userModel.find.mockReturnValue(query([buildUser(UserRole.USER, 'hash')]));

      const response = await request(app.getHttpServer())
        .get('/api/v1/user/getallusers')
        .set('Authorization', 'Bearer ' + token)
        .expect(200);

      expect((response.body as { users: unknown[] }).users).toHaveLength(1);
    });
  });

  describe('error mapping', () => {
    it('answers 400 for a malformed blog id rather than a 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/blog/getsingleblog/not-an-id')
        .expect(400);

      expect(response.body).toEqual({
        message: 'Blog not found',
        success: false,
        status: false,
      });
    });

    it('answers 404 when a valid blog id matches nothing', async () => {
      blogModel.findById.mockReturnValue(query(null));

      await request(app.getHttpServer())
        .get('/api/v1/blog/getsingleblog/' + BLOG_ID)
        .expect(404);
    });

    it('rejects a create body whose image is not an http URL', async () => {
      const token = await tokenFor(UserRole.USER);

      const response = await request(app.getHttpServer())
        .post('/api/v1/blog/create')
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'T', topic: 'x', content: 'c', image: 'not-a-url' })
        .expect(400);

      expect((response.body as { message: string }).message).toContain('image');
    });
  });
});
