import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma/prisma.service';

function setup() {
  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ goraPoints: 50 }),
    },
    gameParticipant: {
      count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
    },
    game: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest
        .fn()
        .mockResolvedValue([{ sportId: 'sport-a' }, { sportId: 'sport-b' }]),
    },
    reel: { count: jest.fn().mockResolvedValue(1) },
    story: { count: jest.fn().mockResolvedValue(4) },
    friendship: { count: jest.fn().mockResolvedValue(2) },
    badge: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'games',
          name: 'Join five',
          description: 'Join five games',
          category: 'GAMES',
          requirement: 'GAMES_JOINED',
          target: 5,
        },
        {
          id: 'points',
          name: 'Fifty',
          description: 'Earn 50 points',
          category: 'POINTS',
          requirement: 'GORA_POINTS',
          target: 50,
        },
      ]),
    },
    userBadge: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
  };
  return {
    prisma,
    service: new AchievementsService(prisma as unknown as PrismaService),
  };
}
it('derives badge progress only from account activity and persists actual unlocks', async () => {
  const { service, prisma } = setup();
  const result = await service.read('signed-in-user');
  expect(result.activityStats).toEqual({
    gamesJoined: 3,
    gamesCompleted: 1,
    gamesHosted: 2,
    highlightsUploaded: 1,
    storiesPosted: 4,
    friendsCount: 2,
    sportsParticipated: 2,
  });
  expect(result.badges[0]).toMatchObject({ progress: 3, unlocked: false });
  expect(result.badges[1]).toMatchObject({ progress: 50, unlocked: true });
  expect(prisma.userBadge.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({
        userId: 'signed-in-user',
        badgeId: 'points',
        progress: 50,
        unlocked: true,
      }),
    }),
  );
  expect(prisma.story.count).toHaveBeenCalledWith({
    where: { userId: 'signed-in-user', deletedAt: null },
  });
});
it('keeps a previously earned badge unlocked when current activity is lower', async () => {
  const { service, prisma } = setup();
  const unlockedAt = new Date('2026-10-01');
  prisma.userBadge.findMany.mockResolvedValue([
    { badgeId: 'games', progress: 5, unlocked: true, unlockedAt },
  ] as never);
  expect((await service.read('user')).badges[0]).toMatchObject({
    progress: 3,
    unlocked: true,
  });
  expect(prisma.userBadge.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      update: expect.objectContaining({ unlocked: true, unlockedAt }),
    }),
  );
});
