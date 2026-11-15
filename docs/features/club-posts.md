# Club profile and posts

Only an active OWNER can change club settings, including its profile and cover images.
The club profile links the owner to the existing photo pickers in Manage Club.

Every active member can create a post from the club profile and choose Public or
Club members only. Club-only posts check current active membership at read time;
the author keeps access to their own posts. Public club posts can appear in Home,
including public posts explicitly created in a private club. Existing private-club
posts keep their restricted audience during migration. Posts retain the original
author and the club label. The Posts tab loads the club's own feed separately.

Every active member can view pending requests and approve joining users. Capacity
and membership are rechecked during approval. Removing members, rejecting requests,
invitations, and role changes retain the existing owner/admin permissions.

## Deployment order

1. Apply `server/prisma/migrations/20261114010000_club_post_audience/migration.sql`
   using the project's standard `prisma migrate deploy` workflow. Test against an
   isolated database before production.
2. Deploy the updated server. Its `build:vercel` script applies pending migrations.
3. Publish/rebuild the mobile client against that server.

The client sends new `clubId` and `clubOnly` fields. Deploying only the client
against the old API will not enable club posting or member approvals.
