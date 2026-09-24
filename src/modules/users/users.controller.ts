import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('edituser/:id')
  @Roles(UserRole.USER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResponse & { userDetails: UserDocument }> {
    const userDetails = await this.usersService.update(id, dto);

    return { message: 'User Updated Successfully', success: true, userDetails };
  }

  @Delete('deleteuser/:id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    await this.usersService.remove(id);

    return { message: 'User deleted Successfully', success: true };
  }

  @Get('getallusers')
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<ApiResponse & { users: UserDocument[] }> {
    const users = await this.usersService.findAll();

    return { success: true, message: 'Users fetched successfully', users };
  }

  @Get('me')
  @Roles(UserRole.USER)
  async getProfile(
    @CurrentUser('_id') userId: string,
  ): Promise<ApiResponse & { profileDetails: UserDocument }> {
    const profileDetails = await this.usersService.getProfile(String(userId));

    return { success: true, message: 'Profile fetched successfully', profileDetails };
  }
}
