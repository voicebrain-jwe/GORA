ALTER TYPE "NotificationType" ADD VALUE 'CLUB_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_JOIN_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_JOIN_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_LEAVE_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_LEAVE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_LEAVE_REJECTED';

CREATE TABLE "ClubMembershipRequest" (
  "id" UUID NOT NULL PRIMARY KEY,
  "clubId" UUID NOT NULL REFERENCES "Club"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" VARCHAR(5) NOT NULL CHECK ("kind" IN ('JOIN', 'LEAVE')),
  "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "ClubMembershipRequest_pending" ON "ClubMembershipRequest"("clubId", "userId", "kind") WHERE "status" = 'PENDING';
CREATE INDEX "ClubMembershipRequest_clubId_status_idx" ON "ClubMembershipRequest"("clubId", "status");
ALTER TABLE "Notification" ADD COLUMN "clubRequestId" UUID REFERENCES "ClubMembershipRequest"("id") ON DELETE CASCADE;
