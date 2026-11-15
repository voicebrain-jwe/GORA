ALTER TABLE "Post" ADD COLUMN "clubOnly" BOOLEAN NOT NULL DEFAULT false;
-- Preserve the audience of existing posts in private clubs.
UPDATE "Post" AS p SET "clubOnly" = true FROM "Club" AS c WHERE p."clubId" = c."id" AND c."isPublic" = false;
ALTER TABLE "Post" ADD CONSTRAINT "Post_clubOnly_requires_club" CHECK (NOT "clubOnly" OR "clubId" IS NOT NULL);
