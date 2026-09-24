import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserDocument } from '../users/schemas/user.schema';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Blog, BlogDocument } from './schemas/blog.schema';

@Injectable()
export class BlogsService {
  constructor(@InjectModel(Blog.name) private readonly blogModel: Model<BlogDocument>) {}

  create(dto: CreateBlogDto, author: UserDocument): Promise<BlogDocument> {
    return this.blogModel.create({
      ...dto,
      user: { id: author._id, name: author.userName },
    });
  }

  findAll(): Promise<BlogDocument[]> {
    return this.blogModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<BlogDocument> {
    const blog = await this.blogModel.findById(this.toObjectId(id)).exec();

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    return blog;
  }

  async findByTopic(topic: string): Promise<BlogDocument[]> {
    const blogs = await this.blogModel.find({ topic }).sort({ createdAt: -1 }).exec();

    if (blogs.length === 0) {
      throw new NotFoundException('Blog not found');
    }

    return blogs;
  }

  async update(id: string, dto: UpdateBlogDto): Promise<BlogDocument> {
    const updated = await this.blogModel
      .findByIdAndUpdate(this.toObjectId(id), { $set: dto }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Invalid ID');
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.blogModel.findByIdAndDelete(this.toObjectId(id)).exec();

    if (!deleted) {
      throw new NotFoundException('Blog not found');
    }
  }

  /**
   * Rejects a malformed id up front, so Mongoose never raises a `CastError` that
   * would surface to the caller as an opaque 500.
   */
  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Blog not found');
    }

    return new Types.ObjectId(id);
  }
}
