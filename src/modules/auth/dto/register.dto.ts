import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../../../common/enums/user-role.enum';

/** Body of `POST /auth/register`. */
export class RegisterDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'userName is required' })
  userName!: string;

  @IsString()
  @IsNotEmpty({ message: 'phoneNumber is required' })
  phoneNumber!: string;

  @IsString()
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password!: string;

  @IsOptional()
  @IsString()
  profilepic?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: `role must be one of: ${Object.values(UserRole).join(', ')}` })
  role?: UserRole;
}
