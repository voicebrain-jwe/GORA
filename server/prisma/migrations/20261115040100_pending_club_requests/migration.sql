-- Existing pending memberships also need reviewable notifications.
INSERT INTO "ClubMembershipRequest" ("id", "clubId", "userId", "kind", "createdAt")
SELECT gen_random_uuid(), "clubId", "userId", 'JOIN', "joinedAt"
FROM "ClubMember" WHERE "status" = 'PENDING'
ON CONFLICT DO NOTHING;

INSERT INTO "Notification" ("id", "userId", "actorId", "type", "clubRequestId")
SELECT gen_random_uuid(), reviewer."userId", request."userId", 'CLUB_JOIN_REQUEST', request."id"
FROM "ClubMembershipRequest" request
JOIN "ClubMember" reviewer ON reviewer."clubId" = request."clubId" AND reviewer."status" = 'ACTIVE'
JOIN "Club" club ON club."id" = request."clubId" AND club."isActive"
JOIN "User" actor ON actor."id" = request."userId" AND actor."isActive"
JOIN "User" recipient ON recipient."id" = reviewer."userId" AND recipient."isActive"
WHERE request."status" = 'PENDING' AND request."kind" = 'JOIN' AND reviewer."userId" <> request."userId"
AND NOT EXISTS (SELECT 1 FROM "Notification" n WHERE n."clubRequestId" = request."id" AND n."userId" = reviewer."userId" AND n."type" = 'CLUB_JOIN_REQUEST');
