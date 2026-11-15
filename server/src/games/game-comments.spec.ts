import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { GamesService } from './games.service';

describe('game comments', () => {
  const author = { id: 'fan', username: 'fan', firstName: 'Fan', lastName: 'One', profileImageUrl: null };
  const prisma = {
    game: { findFirst: jest.fn() },
    gameComment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const service = new GamesService(
    prisma as unknown as PrismaService,
    new ConfigService({ GAME_TIMEZONE: 'Asia/Manila' }),
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.game.findFirst.mockResolvedValue({ id: 'game', hostId: 'host' });
    prisma.gameComment.count.mockResolvedValue(1);
  });

  test('adds a comment with its author and the new total', async () => {
    prisma.gameComment.create.mockResolvedValue({ id: 'c1', content: 'Bring a ball?', createdAt: new Date(), user: author });

    const result = await service.addComment('fan', 'game', 'Bring a ball?');

    expect(prisma.gameComment.create.mock.calls[0][0].data).toEqual({ gameId: 'game', userId: 'fan', content: 'Bring a ball?' });
    expect(result.comment.author).toEqual(author);
    expect(result.total).toBe(1);
  });

  test('cannot comment on a game the viewer cannot see', async () => {
    prisma.game.findFirst.mockResolvedValue(null);

    await expect(service.addComment('fan', 'game', 'hi')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.gameComment.create).not.toHaveBeenCalled();
  });

  test.each([
    ['the author', 'fan'],
    ['the host', 'host'],
  ])('%s can delete a comment', async (_label, viewer) => {
    prisma.gameComment.findFirst.mockResolvedValue({ userId: 'fan' });

    await service.deleteComment(viewer, 'game', 'c1');

    expect(prisma.gameComment.deleteMany).toHaveBeenCalledWith({ where: { id: 'c1', gameId: 'game' } });
  });

  test('another player cannot delete someone else\'s comment', async () => {
    prisma.gameComment.findFirst.mockResolvedValue({ userId: 'fan' });

    await expect(service.deleteComment('stranger', 'game', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.gameComment.deleteMany).not.toHaveBeenCalled();
  });
});
