import { ClubsService } from './clubs.service';

function fixture(reviewerStatus = 'ACTIVE', requesterId = 'member') {
  const request = {
    id: 'request',
    clubId: 'club',
    userId: requesterId,
    kind: 'LEAVE',
    status: 'PENDING',
  };
  const tx = {
    club: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
    $queryRaw: jest.fn().mockResolvedValue([{ maxMembers: 50 }]),
    clubMember: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({ status: reviewerStatus, role: 'MEMBER' })
        .mockResolvedValue({
          id: 'membership',
          status: 'ACTIVE',
          role: 'MEMBER',
        }),
      delete: jest.fn().mockResolvedValue({}),
    },
    clubMembershipRequest: {
      findFirst: jest.fn().mockResolvedValue(request),
      findMany: jest.fn().mockResolvedValue([request]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    $transaction: (work: (value: typeof tx) => unknown) => work(tx),
  };
  const service = new ClubsService(
    prisma as never,
    { get: () => undefined } as never,
    {} as never,
    {} as never,
  );
  return { service, tx };
}

describe('club leave permission', () => {
  it('lets an active member approve a leave and saves the outcome in the same transaction', async () => {
    const { service, tx } = fixture();
    expect(
      await service.respondToLeave('reviewer', 'club', 'request', true),
    ).toMatchObject({ status: 'ACCEPTED' });
    expect(tx.clubMember.delete).toHaveBeenCalledWith({
      where: { id: 'membership' },
    });
    expect(
      tx.clubMembershipRequest.updateMany.mock.calls[0][0].data.status,
    ).toBe('ACCEPTED');
    expect(tx.notification.createMany.mock.calls[0][0].data[0].type).toBe(
      'CLUB_LEAVE_ACCEPTED',
    );
  });
  it('declining preserves membership', async () => {
    const { service, tx } = fixture();
    await service.respondToLeave('reviewer', 'club', 'request', false);
    expect(tx.clubMember.delete).not.toHaveBeenCalled();
    expect(
      tx.clubMembershipRequest.updateMany.mock.calls[0][0].data.status,
    ).toBe('REJECTED');
  });
  it.each(['PENDING', 'REMOVED', 'BANNED'])(
    'rejects a %s reviewer',
    async (status) => {
      const { service, tx } = fixture(status);
      await expect(
        service.respondToLeave('reviewer', 'club', 'request', true),
      ).rejects.toThrow('Only active club members');
      expect(tx.clubMember.delete).not.toHaveBeenCalled();
    },
  );
  it('prevents accepting your own request or repeating a completed request', async () => {
    const { service, tx } = fixture('ACTIVE', 'reviewer');
    await expect(
      service.respondToLeave('reviewer', 'club', 'request', true),
    ).rejects.toThrow('own leave');
    tx.clubMember.findUnique
      .mockReset()
      .mockResolvedValue({ status: 'ACTIVE' });
    tx.clubMembershipRequest.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      service.respondToLeave('reviewer', 'club', 'request', true),
    ).rejects.toThrow('no longer pending');
  });
});
