import { NotificationsService } from './notifications.service';
import type { PrismaService } from '../prisma/prisma.service';

const row = (type: string, extra = {}) => ({
  id: 'notification',
  type,
  isRead: true,
  createdAt: new Date(),
  actor: {
    id: 'actor',
    username: 'player',
    firstName: 'Test',
    lastName: 'Player',
    profileImageUrl: null,
  },
  gameId: null,
  game: null,
  friendship: null,
  clubRequest: null,
  ...extra,
});
async function views(rows: unknown[]) {
  const prisma = {
    userSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    notification: {
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: (work: Promise<unknown>[]) => Promise.all(work),
    gameLeaveRequest: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { gameId: 'game', userId: 'actor', status: 'APPROVED' },
        ]),
    },
  };
  return (
    await new NotificationsService(prisma as unknown as PrismaService).list(
      'recipient',
      { limit: 40, offset: 0 },
    )
  ).items;
}

describe('request notifications reflect the saved decision', () => {
  it('keeps pending friends actionable and turns accepted requests into friendship confirmations', async () => {
    const items = await views([
      row('FRIEND_REQUEST', { friendship: { status: 'PENDING' } }),
      row('FRIEND_REQUEST', { friendship: { status: 'ACCEPTED' } }),
      row('FRIEND_REQUEST'),
    ]);
    expect(items[0].actionStatus).toBeNull();
    expect(items[1]).toMatchObject({
      actionStatus: 'friend-accepted',
      title: 'Friend request accepted',
      link: '/profile/friends',
    });
    expect(items[1].body).toContain('are now friends');
    expect(items[2].actionStatus).toBe('resolved');
  });
  it('changes accepted game join and approved game leave text after reloading', async () => {
    const items = await views([
      row('GAME_JOIN_REQUEST', {
        gameId: 'game',
        game: { title: 'Basketball' },
        joinRequest: { status: 'ACCEPTED' },
      }),
      row('GAME_LEAVE_REQUEST', {
        gameId: 'game',
        game: { title: 'Basketball' },
      }),
    ]);
    expect(items[0]).toMatchObject({
      actionStatus: 'join-accepted',
      title: 'Game join request accepted',
    });
    expect(items[1]).toMatchObject({
      actionStatus: 'leave-approved',
      title: 'Game leave request approved',
    });
  });
  it('uses the request record for club decisions, including notifications sent to other reviewers', async () => {
    const clubRequest = {
      id: 'request-id',
      clubId: 'club',
      kind: 'JOIN',
      status: 'ACCEPTED',
      club: { name: 'Team' },
    };
    const items = await views([
      row('CLUB_JOIN_REQUEST', { clubRequest }),
      row('CLUB_LEAVE_REQUEST', {
        clubRequest: { ...clubRequest, kind: 'LEAVE', status: 'REJECTED' },
      }),
    ]);
    expect(items[0]).toMatchObject({
      actionStatus: 'club-join-accepted',
      clubRequestId: 'request-id',
      link: '/clubs/club',
    });
    expect(items[1]).toMatchObject({
      actionStatus: 'club-leave-rejected',
      title: 'Club leave request declined',
    });
  });
});
