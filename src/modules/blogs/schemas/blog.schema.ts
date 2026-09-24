import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import { User } from '../../users/schemas/user.schema';

/**
 * Author snapshot stored on the blog. The name is denormalised so listing blogs
 * needs no join, while `id` still references the user document.
 */
@Schema({ _id: false })
export class BlogAuthor {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  id!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;
}

export const BlogAuthorSchema = SchemaFactory.createForClass(BlogAuthor);

@Schema({ timestamps: true, collection: 'blogs' })
export class Blog {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  topic!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ type: BlogAuthorSchema, required: true })
  user!: BlogAuthor;

  createdAt!: Date;
  updatedAt!: Date;
}

export type BlogDocument = HydratedDocument<Blog>;

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Topic lookups (`GET /blog/getblogbytopic/:topic`) are the hottest query path.
BlogSchema.index({ topic: 1 });
