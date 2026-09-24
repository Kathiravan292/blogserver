import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 10;

/** The user payload returned on a successful login, plus the access token. */
export interface AuthenticatedUser {
  _id: string;
  email: string;
  userName: string;
  phoneNumber: string;
  profilepic: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException('User already exists!');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    await this.usersService.create({
      email: dto.email,
      userName: dto.userName,
      phoneNumber: dto.phoneNumber,
      profilepic: dto.profilepic ?? '',
      role: dto.role ?? UserRole.USER,
      password,
    });
  }

  async login(dto: LoginDto): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    const isPasswordMatch = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordMatch) {
      // Kept as 404 so the existing client's error handling is unchanged.
      throw new NotFoundException('Invalid password');
    }

    return { ...this.toAuthenticatedUser(user), token: this.signToken(user) };
  }

  private signToken(user: UserDocument): string {
    const payload: JwtPayload = { id: String(user._id), userName: user.userName };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('app.jwtSecret'),
      expiresIn: this.configService.getOrThrow<string>(
        'app.jwtExpiresIn',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private toAuthenticatedUser(user: UserDocument): Omit<AuthenticatedUser, 'token'> {
    return {
      _id: String(user._id),
      email: user.email,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
      profilepic: user.profilepic,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
