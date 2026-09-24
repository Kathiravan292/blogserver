import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';

import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return Promise.resolve(null);
    }

    return this.userModel.findById(id).exec();
  }

  create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<UserDocument> {
    return this.userModel.create(user);
  }

  async findAll(): Promise<UserDocument[]> {
    const users = await this.userModel.find().select('-password').exec();

    if (users.length === 0) {
      throw new NotFoundException('No users found');
    }

    return users;
  }

  async getProfile(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid User ID');
    }

    const user = await this.userModel.findById(userId).select('-password').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Applies a partial profile update. A supplied password is hashed before it is
   * written; omitting it leaves the existing hash untouched.
   */
  async update(userId: string, dto: UpdateUserDto): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const { password, ...profile } = dto;
    const changes: Partial<User> = { ...profile };

    if (password) {
      changes.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true })
      .select('-password')
      .exec();

    if (!updated) {
      throw new NotFoundException('User Not Found!');
    }

    return updated;
  }

  async remove(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const deleted = await this.userModel.findByIdAndDelete(userId).exec();

    if (!deleted) {
      throw new NotFoundException('User Not Found!');
    }
  }
}
