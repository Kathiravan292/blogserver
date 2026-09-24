import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

/** Body of `POST /blog/create`. */
export class CreateBlogDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'topic is required' })
  topic!: string;

  @IsString()
  @IsNotEmpty({ message: 'content is required' })
  content!: string;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'image must be a valid URL starting with http or https' },
  )
  image!: string;
}
