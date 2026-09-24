import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiDataResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { UserDocument } from '../users/schemas/user.schema';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogDocument } from './schemas/blog.schema';

@Controller('blog')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async create(
    @Body() dto: CreateBlogDto,
    @CurrentUser() author: UserDocument,
  ): Promise<ApiResponse> {
    await this.blogsService.create(dto, author);

    return { message: 'Blog Created Successfully!', success: true };
  }

  @Get('getallblog')
  async findAll(): Promise<ApiResponse & { blogs: BlogDocument[] }> {
    const blogs = await this.blogsService.findAll();

    return { message: 'blogs get successfully', blogs, success: true };
  }

  @Get('getsingleblog/:id')
  async findOne(@Param('id') id: string): Promise<ApiDataResponse<BlogDocument>> {
    const data = await this.blogsService.findOne(id);

    return { message: 'Single blog success', data, success: true };
  }

  @Get('getblogbytopic/:topic')
  async findByTopic(@Param('topic') topic: string): Promise<ApiDataResponse<BlogDocument[]>> {
    const data = await this.blogsService.findByTopic(topic);

    return { message: 'Single blog success', data, success: true };
  }

  @Put('editblog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
  ): Promise<ApiDataResponse<BlogDocument>> {
    const data = await this.blogsService.update(id, dto);

    return { message: 'Blog Edited Successfully', data, success: true };
  }

  @Delete('deleteblog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  async remove(@Param('id') id: string): Promise<ApiResponse> {
    await this.blogsService.remove(id);

    return { message: 'Blog deleted Successfully', success: true };
  }
}
