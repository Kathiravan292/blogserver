import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../../common/enums/user-role.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const CONFIG: Record<string, string> = {
  'app.jwtSecret': 'test-secret',
  'app.jwtExpiresIn': '9d',
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };

  /** The user object handed to `UsersService.create`, typed for assertions. */
  const createdUserArg = (): { password: string; role: UserRole } => {
    const [[created]] = usersService.create.mock.calls as [[{ password: string; role: UserRole }]];

    return created;
  };

  const buildUser = (password: string): UserDocument =>
    ({
      _id: '652f1c2b8f1b2c0012345678',
      email: 'ada@example.com',
      userName: 'Ada',
      phoneNumber: '9876543210',
      profilepic: '',
      password,
      role: UserRole.USER,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    }) as unknown as UserDocument;

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), create: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: new JwtService({}) },
        { provide: ConfigService, useValue: { getOrThrow: (key: string) => CONFIG[key] } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password before persisting the user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(buildUser('hashed'));

      await service.register({
        email: 'ada@example.com',
        userName: 'Ada',
        phoneNumber: '9876543210',
        password: 'super-secret',
      });

      const created = createdUserArg();
      expect(created.password).not.toBe('super-secret');
      await expect(bcrypt.compare('super-secret', created.password)).resolves.toBe(true);
    });

    it('defaults the role to "user" when none is supplied', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(buildUser('hashed'));

      await service.register({
        email: 'ada@example.com',
        userName: 'Ada',
        phoneNumber: '9876543210',
        password: 'super-secret',
      });

      expect(createdUserArg()).toMatchObject({ role: UserRole.USER });
    });

    it('rejects a duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser('hashed'));

      await expect(
        service.register({
          email: 'ada@example.com',
          userName: 'Ada',
          phoneNumber: '9876543210',
          password: 'super-secret',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    it('returns a signed token and the user without the password hash', async () => {
      const hash = await bcrypt.hash('super-secret', 10);
      usersService.findByEmail.mockResolvedValue(buildUser(hash));

      const result = await service.login({ email: 'ada@example.com', password: 'super-secret' });

      expect(result.token).toEqual(expect.any(String));
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('ada@example.com');
      expect(result.role).toBe(UserRole.USER);
    });

    it('signs the id and userName claims the client expects', async () => {
      const hash = await bcrypt.hash('super-secret', 10);
      usersService.findByEmail.mockResolvedValue(buildUser(hash));

      const { token } = await service.login({
        email: 'ada@example.com',
        password: 'super-secret',
      });
      const claims = new JwtService({}).verify<{ id: string; userName: string }>(token, {
        secret: 'test-secret',
      });

      expect(claims).toMatchObject({ id: '652f1c2b8f1b2c0012345678', userName: 'Ada' });
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'super-secret' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a wrong password', async () => {
      const hash = await bcrypt.hash('super-secret', 10);
      usersService.findByEmail.mockResolvedValue(buildUser(hash));

      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
