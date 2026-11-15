import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { visibleTaggedUserWhere } from '../posts/post-visibility';
import { formatDisplayName } from '../users/display-name';
import { visibleGamesWhere } from '../games/game-visibility';

@Injectable()
export class DiscoveryCatalogService {
  constructor(private readonly prisma: PrismaService) {}
  async players(viewerId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [visibleTaggedUserWhere(viewerId), { id: { not: viewerId } }],
      },
      take: 30,
      orderBy: [{ followers: { _count: 'desc' } }, { id: 'asc' }],
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        city: true,
        profileImageUrl: true,
        sports: {
          where: { sport: { isActive: true } },
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { sport: { select: { name: true } } },
        },
        _count: {
          select: {
            followers: { where: { follower: { isActive: true } } },
            gameParticipants: {
              where: {
                status: 'COMPLETED',
                game: {
                  AND: [{ status: 'COMPLETED' }, visibleGamesWhere(viewerId)],
                },
              },
            },
          },
        },
      },
    });
    return users.map(({ sports, _count, ...user }) => ({
      ...user,
      avatarUrl: user.profileImageUrl,
      displayName: formatDisplayName(user),
      city: user.city ?? '',
      primarySport: sports[0]?.sport.name ?? '',
      distanceKm: null,
      followers: _count.followers,
      gamesCompleted: _count.gameParticipants,
      featured: _count.gameParticipants >= 10,
    }));
  }
}
