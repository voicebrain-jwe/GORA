import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const METRICS = {
  GAMES_JOINED: ['gamesJoined', 'game', 'games'],
  GAMES_COMPLETED: ['gamesCompleted', 'game', 'games'],
  GAMES_HOSTED: ['gamesHosted', 'game', 'games'],
  HIGHLIGHTS_UPLOADED: ['highlightsUploaded', 'highlight', 'highlights'],
  STORIES_POSTED: ['storiesPosted', 'story', 'stories'],
  FRIENDS: ['friendsCount', 'friend', 'friends'],
  SPORTS_PARTICIPATED: ['sportsParticipated', 'sport', 'sports'],
  GORA_POINTS: ['goraPoints', 'point', 'points'],
} as const;

/** Icon keys understood by the app's badge tiles (BadgeIcon). */
const CATEGORY_ICONS = {
  GAMES: 'flag',
  COMPLETION: 'trophy',
  HOSTING: 'megaphone',
  HIGHLIGHTS: 'videocam',
  STORIES: 'book',
  SOCIAL: 'people',
  COMMUNITY: 'globe',
  POINTS: 'flash',
} as const;

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async read(userId: string) {
    const [
      user,
      joined,
      completed,
      hosted,
      reels,
      stories,
      friends,
      sports,
      definitions,
      earned,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { goraPoints: true },
      }),
      this.prisma.gameParticipant.count({
        where: {
          userId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          game: { status: { not: 'CANCELLED' } },
        },
      }),
      this.prisma.gameParticipant.count({
        where: { userId, status: 'COMPLETED', game: { status: 'COMPLETED' } },
      }),
      this.prisma.game.count({
        where: { hostId: userId, status: { not: 'CANCELLED' } },
      }),
      this.prisma.reel.count({ where: { userId, deletedAt: null } }),
      this.prisma.story.count({ where: { userId, deletedAt: null } }),
      this.prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { receiverId: userId }],
          requester: { isActive: true },
          receiver: { isActive: true },
        },
      }),
      this.prisma.game.findMany({
        where: {
          status: { not: 'CANCELLED' },
          participants: {
            some: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
          },
        },
        distinct: ['sportId'],
        select: { sportId: true },
      }),
      this.prisma.badge.findMany({
        orderBy: [{ category: 'asc' }, { target: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.userBadge.findMany({ where: { userId } }),
    ]);
    const activityStats = {
      gamesJoined: joined,
      gamesCompleted: completed,
      gamesHosted: hosted,
      highlightsUploaded: reels,
      storiesPosted: stories,
      friendsCount: friends,
      sportsParticipated: sports.length,
    };
    const progressByMetric = {
      ...activityStats,
      goraPoints: Math.max(0, user.goraPoints),
    };
    const badges = await Promise.all(
      definitions.map(async (badge) => {
        const [metric, singular, plural] = METRICS[badge.requirement];
        const progress = progressByMetric[metric];
        const previous = earned.find((item) => item.badgeId === badge.id);
        const unlocked = !!previous?.unlocked || progress >= badge.target;
        if (
          !previous ||
          previous.progress !== progress ||
          previous.unlocked !== unlocked
        ) {
          await this.prisma.userBadge.upsert({
            where: { userId_badgeId: { userId, badgeId: badge.id } },
            create: {
              userId,
              badgeId: badge.id,
              progress,
              unlocked,
              unlockedAt: unlocked ? new Date() : null,
            },
            update: {
              progress,
              unlocked,
              unlockedAt:
                previous?.unlockedAt ?? (unlocked ? new Date() : null),
            },
          });
        }
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          target: badge.target,
          progress,
          unlocked,
          icon: CATEGORY_ICONS[badge.category] ?? 'medal',
          requirement: {
            metric,
            text: badge.description,
            unit: { singular, plural },
          },
        };
      }),
    );
    return { activityStats, badges };
  }
}
