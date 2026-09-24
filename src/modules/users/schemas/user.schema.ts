import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { UserRole } from '../../../common/enums/user-role.enum';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  userName!: string;

  // Stored as a string so leading zeros and country prefixes survive a round trip.
  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ default: '' })
  profilepic!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

/** A user with `password` stripped — what the API is allowed to hand back. */
export type SafeUser = Omit<User, 'password'> & { _id: string };

export const UserSchema = SchemaFactory.createForClass(User);

/**
 * Keeps the hash out of every `toJSON()` / `toObject()` result so it cannot leak
 * through a response by accident.
 */
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as Partial<User>).password;
    return ret;
  },
});
