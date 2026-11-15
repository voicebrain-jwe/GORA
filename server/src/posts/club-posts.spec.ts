import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AudienceService } from '../social/audience.service';

describe('club post creation permissions', () => {
  const clubId = '11111111-1111-4111-8111-111111111111';

  function setup(status: string | null, isActive = true) {
    const write = jest.fn().mockRejectedValue(new Error('write reached'));
    const tx = {
      clubMember: { findUnique: jest.fn().mockResolvedValue(status ? { status, club: { isActive } } : null) },
      post: { create: write },
    };
    const prisma = { $transaction: (work: (transaction: typeof tx) => unknown) => work(tx) };
    const audience = { resolve: jest.fn().mockResolvedValue(null) };
    const service = new PostsService(
      prisma as unknown as PrismaService,
      undefined!, undefined!, audience as unknown as AudienceService, undefined!, undefined!,
    );
    return { service, write };
  }

  it.each([null, 'PENDING', 'REMOVED', 'BANNED'])('rejects posts from %s membership', async (status) => {
    const { service, write } = setup(status);
    await expect(service.create('author', { caption: 'Hello club', clubId, clubOnly: true, visibility: 'PUBLIC' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects posts in inactive clubs', async () => {
    const { service, write } = setup('ACTIVE', false);
    await expect(service.create('author', { caption: 'Hello', clubId, visibility: 'PUBLIC' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(write).not.toHaveBeenCalled();
  });

  it.each([true, false])('writes the chosen club audience: clubOnly=%s', async (clubOnly) => {
    const { service, write } = setup('ACTIVE');
    await expect(service.create('author', { caption: 'Hello', clubId, clubOnly, visibility: 'PUBLIC' })).rejects.toThrow('write reached');
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'author', clubId, clubOnly }) }));
  });

  it('refuses a club audience without a club', async () => {
    const { service, write } = setup('ACTIVE');
    await expect(service.create('author', { caption: 'Hello', clubOnly: true, visibility: 'PUBLIC' })).rejects.toBeInstanceOf(BadRequestException);
    expect(write).not.toHaveBeenCalled();
  });
});
