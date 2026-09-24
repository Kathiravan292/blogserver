import { PartialType } from '@nestjs/mapped-types';

import { CreateBlogDto } from './create-blog.dto';

/**
 * Body of `PUT /blog/editblog/:id` — every field of `CreateBlogDto`, all optional,
 * so a caller can patch just the title.
 */
export class UpdateBlogDto extends PartialType(CreateBlogDto) {}
