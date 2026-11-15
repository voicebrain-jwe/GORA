import type { Prisma } from '../generated/prisma/client';

/** Called while holding the club row lock, so duplicate taps cannot enqueue twice. */
export async function createClubRequest(
  tx: Prisma.TransactionClient,
  clubId: string,
  userId: string,
  kind: 'JOIN' | 'LEAVE',
) {
  const existing = await tx.clubMembershipRequest.findFirst({
    where: { clubId, userId, kind, status: 'PENDING' },
  });
  if (existing) return existing;
  const request = await tx.clubMembershipRequest.create({
    data: { clubId, userId, kind },
  });
  const members = await tx.clubMember.findMany({
    where: {
      clubId,
      status: 'ACTIVE',
      userId: { not: userId },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  if (members.length)
    await tx.notification.createMany({
      data: members.map((member) => ({
        userId: member.userId,
        actorId: userId,
        clubRequestId: request.id,
        type:
          kind === 'JOIN'
            ? ('CLUB_JOIN_REQUEST' as const)
            : ('CLUB_LEAVE_REQUEST' as const),
      })),
    });
  return request;
}

export async function resolveClubRequests(
  tx: Prisma.TransactionClient,
  clubId: string,
  userId: string,
  kind: 'JOIN' | 'LEAVE',
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED',
  actorId: string,
) {
  const requests = await tx.clubMembershipRequest.findMany({
    where: { clubId, userId, kind, status: 'PENDING' },
    select: { id: true },
  });
  if (!requests.length) return;
  await tx.clubMembershipRequest.updateMany({
    where: { id: { in: requests.map((r) => r.id) }, status: 'PENDING' },
    data: { status, resolvedAt: new Date() },
  });
  if (status === 'CANCELLED') return;
  const type =
    kind === 'JOIN'
      ? status === 'ACCEPTED'
        ? 'CLUB_JOIN_ACCEPTED'
        : 'CLUB_JOIN_REJECTED'
      : status === 'ACCEPTED'
        ? 'CLUB_LEAVE_ACCEPTED'
        : 'CLUB_LEAVE_REJECTED';
  await tx.notification.createMany({
    data: requests.map((r) => ({ userId, actorId, clubRequestId: r.id, type })),
  });
}
