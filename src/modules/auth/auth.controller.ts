import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ApiDataResponse, ApiStatusResponse } from '../../common/interfaces/api-response.interface';
import { AuthService, AuthenticatedUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDto): Promise<ApiStatusResponse> {
    await this.authService.register(dto);

    // `status` rather than `success`: the original endpoint's contract.
    return { message: 'User added successfully', status: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiDataResponse<AuthenticatedUser>> {
    const data = await this.authService.login(dto);

    return { message: 'User logged in successfully', success: true, data };
  }
}
