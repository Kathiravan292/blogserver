import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';
import { AuthController } from './modules/auth/auth.controller';
import { BlogsController } from './modules/blogs/blogs.controller';
import { Blog } from './modules/blogs/schemas/blog.schema';
import { User } from './modules/users/schemas/user.schema';
import { UsersController } from './modules/users/users.controller';

/**
 * Boots the real module graph with the Mongoose connection stubbed out. This is what
 * catches a provider that a module forgot to export — a failure that otherwise only
 * appears the first time the server starts.
 */
describe('AppModule', () => {
  it('resolves every controller and provider', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getConnectionToken())
      .useValue({ close: jest.fn() })
      .overrideProvider(getModelToken(User.name))
      .useValue({})
      .overrideProvider(getModelToken(Blog.name))
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthController)).toBeDefined();
    expect(moduleRef.get(UsersController)).toBeDefined();
    expect(moduleRef.get(BlogsController)).toBeDefined();

    await moduleRef.close();
  });
});
