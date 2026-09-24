import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { UserDocument } from '../users/schemas/user.schema';
import { BlogsService } from './blogs.service';
import { Blog, BlogDocument } from './schemas/blog.schema';

const VALID_ID = '652f1c2b8f1b2c0012345678';

/** Mimics `Query.exec()` so the service can be exercised without a live database. */
const query = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });
const sortedQuery = <T>(value: T) => ({ sort: jest.fn().mockReturnValue(query(value)) });

describe('BlogsService', () => {
  let service: BlogsService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  const blog = { _id: VALID_ID, title: 'Hello' } as unknown as BlogDocument;

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [BlogsService, { provide: getModelToken(Blog.name), useValue: model }],
    }).compile();

    service = moduleRef.get(BlogsService);
  });

  it('stamps the author id and name onto a new blog', async () => {
    const author = { _id: VALID_ID, userName: 'Ada' } as unknown as UserDocument;
    model.create.mockResolvedValue(blog);

    await service.create(
      { title: 'Hello', topic: 'tech', content: 'body', image: 'https://img.test/a.png' },
      author,
    );

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: VALID_ID, name: 'Ada' } }),
    );
  });

  it('returns blogs newest first', async () => {
    const sort = jest.fn().mockReturnValue(query([blog]));
    model.find.mockReturnValue({ sort });

    await expect(service.findAll()).resolves.toEqual([blog]);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('rejects a malformed id with 400 instead of letting a CastError become a 500', async () => {
    await expect(service.findOne('not-an-object-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('raises 404 when a valid id matches no blog', async () => {
    model.findById.mockReturnValue(query(null));

    await expect(service.findOne(VALID_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('raises 404 when a topic has no blogs', async () => {
    model.find.mockReturnValue(sortedQuery([]));

    await expect(service.findByTopic('empty')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the updated document', async () => {
    model.findByIdAndUpdate.mockReturnValue(query(blog));

    await expect(service.update(VALID_ID, { title: 'Updated' })).resolves.toEqual(blog);
  });

  it('raises 404 when deleting a blog that does not exist', async () => {
    model.findByIdAndDelete.mockReturnValue(query(null));

    await expect(service.remove(VALID_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
