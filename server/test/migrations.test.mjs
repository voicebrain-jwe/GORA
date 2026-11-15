import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('../prisma/migrations/', import.meta.url));
const cloudMigration = '20261115010000_cloudinary_media';
const catalogMigration = '20261115020000_complete_sports_catalog';
const sql = (directory) => readFile(join(root, directory, 'migration.sql'), 'utf8');

test('production migrations preserve existing media and restore the complete sports catalog', async (t) => {
  const db = new PGlite();
  try {
    const migrations = (await readdir(root, { withFileTypes: true }))
      .filter((item) => item.isDirectory()).map((item) => item.name).sort();
    for (const directory of migrations.filter((name) => name < cloudMigration)) {
      try { await db.exec(await sql(directory)); }
      catch (error) { throw new Error(`Migration failed: ${directory}`, { cause: error }); }
    }
    assert.deepEqual((await db.query('SELECT "name" FROM "Sport"')).rows, [{ name: 'Esports' }]);
    const owner = randomUUID();
    await db.query(`INSERT INTO "User" ("id","username","email","passwordHash","firstName","lastName","updatedAt")
      VALUES ($1,'migration_test','migration@example.test','not-a-login-hash','Migration','Test',now())`, [owner]);
    const oldStory = randomUUID();
    await db.query(`INSERT INTO "Story" ("id","userId","mediaType","mediaUrl","expiresAt")
      VALUES ($1,$2,'IMAGE',$3,now()+interval '1 day')`, [oldStory, owner, `blob:${oldStory}.png`]);
    const oldReel = randomUUID();
    await db.query(`INSERT INTO "Reel" ("id","userId","videoUrl","updatedAt") VALUES ($1,$2,$3,now())`,
      [oldReel, owner, `upload:${oldReel}.mp4`]);
    for (const directory of migrations.filter((name) => name >= cloudMigration)) await db.exec(await sql(directory));

    await t.test('restores all 11 default sports after a migrations-only deployment', async () => {
      const rows = (await db.query('SELECT "name","isActive" FROM "Sport" ORDER BY "name"')).rows;
      assert.deepEqual(rows.map((row) => row.name), [
        'Badminton', 'Basketball', 'Cycling', 'Esports', 'Football', 'Other',
        'Running', 'Swimming', 'Table Tennis', 'Tennis', 'Volleyball',
      ]);
      assert.ok(rows.every((row) => row.isActive));
    });

    await t.test('rerunning the sports backfill preserves IDs, player links and admin changes', async () => {
      const { id } = (await db.query(`UPDATE "Sport" SET "isActive"=false,"description"='Admin description',"iconUrl"='admin-icon'
        WHERE "name"='Basketball' RETURNING "id"`)).rows[0];
      await db.query(`INSERT INTO "UserSport" ("id","userId","sportId","updatedAt") VALUES ($1,$2,$3,now())`, [randomUUID(), owner, id]);
      await db.exec(await sql(catalogMigration));
      assert.deepEqual((await db.query(`SELECT "id","isActive","description","iconUrl" FROM "Sport" WHERE "name"='Basketball'`)).rows[0],
        { id, isActive: false, description: 'Admin description', iconUrl: 'admin-icon' });
      assert.equal((await db.query('SELECT count(*)::int AS count FROM "Sport"')).rows[0].count, 11);
      assert.equal((await db.query('SELECT "sportId" FROM "UserSport" WHERE "userId"=$1', [owner])).rows[0].sportId, id);
    });

    await t.test('creates a club with owner membership, chat and Cloudinary photo references atomically', async () => {
      const club = randomUUID();
      const sport = (await db.query(`SELECT "id" FROM "Sport" WHERE "name"='Volleyball'`)).rows[0].id;
      await db.query(`INSERT INTO "Club" ("id","ownerId","name","slug","description","sportId","maxMembers","membershipType","isPublic","updatedAt")
        VALUES ($1,$2,'Photo Club','migration-photo-club','Club photo migration test',$3,50,'APPROVAL_REQUIRED',true,now())`, [club, owner, sport]);
      const membership = (await db.query('SELECT "role","status" FROM "ClubMember" WHERE "clubId"=$1 AND "userId"=$2', [club, owner])).rows[0];
      assert.deepEqual(membership, { role: 'OWNER', status: 'ACTIVE' });
      assert.equal((await db.query('SELECT "type" FROM "Conversation" WHERE "clubId"=$1', [club])).rows[0].type, 'CLUB');
      for (const kind of ['profile', 'cover']) {
        const revision = randomUUID();
        await db.query(`INSERT INTO "ClubPhoto" ("clubId","kind","revision","data","storageRef","contentType","updatedAt")
          VALUES ($1,$2,$3,NULL,$4,'image/png',now())`, [club, kind, revision, `cloudinary:gora/photos/${revision}.png`]);
        const column = kind === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
        await db.query(`UPDATE "Club" SET "${column}"=$1 WHERE "id"=$2`, [`/api/v1/clubs/${club}/photos/${kind}/${revision}`, club]);
      }
      assert.equal((await db.query('SELECT count(*)::int AS count FROM "ClubPhoto" WHERE "clubId"=$1 AND "data" IS NULL', [club])).rows[0].count, 2);
    });

    await t.test('accepts a photo-only post with a Cloudinary reference and no database image bytes', async () => {
      const post = randomUUID();
      const photo = randomUUID();
      const sport = (await db.query(`SELECT "id" FROM "Sport" WHERE "name"='Badminton'`)).rows[0].id;
      await db.query(`INSERT INTO "Post" ("id","userId","caption","sportId","visibility","updatedAt")
        VALUES ($1,$2,NULL,$3,'PUBLIC',now())`, [post, owner, sport]);
      await db.query(`INSERT INTO "PostMedia" ("id","postId","mediaType","mediaUrl","photoData","contentType","sortOrder")
        VALUES ($1,$2,'IMAGE',$3,NULL,'image/jpeg',0)`, [photo, post, `cloudinary:gora/photos/${photo}.jpg`]);
      const row = (await db.query(`SELECT p."caption",m."mediaUrl",m."photoData" FROM "Post" p
        JOIN "PostMedia" m ON m."postId"=p."id" WHERE p."id"=$1`, [post])).rows[0];
      assert.equal(row.caption, null);
      assert.equal(row.photoData, null);
      assert.equal(row.mediaUrl, `cloudinary:gora/photos/${photo}.jpg`);
    });

    await t.test('installs badge definitions without inventing user progress or overwriting managed badges', async () => {
      const badges = (await db.query('SELECT id,name,target FROM "Badge" ORDER BY name')).rows;
      assert.ok(badges.length >= 30);
      assert.ok(badges.every((badge) => badge.target > 0));
      assert.equal((await db.query('SELECT count(*)::int AS count FROM "UserBadge"')).rows[0].count, 0);
      await db.query('UPDATE "Badge" SET description=$1 WHERE id=$2', ['Admin-managed description', badges[0].id]);
      await db.exec(await sql('20261115030000_badge_catalog'));
      assert.equal((await db.query('SELECT count(*)::int AS count FROM "Badge"')).rows[0].count, badges.length);
      assert.equal((await db.query('SELECT description FROM "Badge" WHERE id=$1', [badges[0].id])).rows[0].description, 'Admin-managed description');
    });

    await t.test('keeps one pending club request per kind and retains decisions after a new request', async () => {
      const club = (await db.query('SELECT id FROM "Club" LIMIT 1')).rows[0].id;
      const first = randomUUID();
      await db.query('INSERT INTO "ClubMembershipRequest" (id,"clubId","userId",kind) VALUES ($1,$2,$3,\'LEAVE\')', [first, club, owner]);
      await assert.rejects(db.query('INSERT INTO "ClubMembershipRequest" (id,"clubId","userId",kind) VALUES ($1,$2,$3,\'LEAVE\')', [randomUUID(), club, owner]), error => error.code === '23505');
      await db.query('UPDATE "ClubMembershipRequest" SET status=\'ACCEPTED\',"resolvedAt"=now() WHERE id=$1', [first]);
      await db.query('INSERT INTO "ClubMembershipRequest" (id,"clubId","userId",kind) VALUES ($1,$2,$3,\'LEAVE\')', [randomUUID(), club, owner]);
      assert.equal((await db.query('SELECT status FROM "ClubMembershipRequest" WHERE id=$1', [first])).rows[0].status, 'ACCEPTED');
      await assert.rejects(db.query('INSERT INTO "ClubMembershipRequest" (id,"clubId","userId",kind) VALUES ($1,$2,$3,\'OTHER\')', [randomUUID(), club, owner]), error => error.code === '23514');
    });

    await t.test('backfills pending club joins once without duplicating reviewer notifications', async () => {
      const club = (await db.query('SELECT id FROM "Club" LIMIT 1')).rows[0].id;
      const member = randomUUID();
      await db.query(`INSERT INTO "User" (id,username,email,"passwordHash","firstName","lastName","updatedAt") VALUES ($1,'backfill_member','backfill@example.test','not-a-login-hash','Backfill','Member',now())`, [member]);
      await db.query(`INSERT INTO "ClubMember" (id,"clubId","userId",status,"updatedAt") VALUES ($1,$2,$3,'PENDING',now())`, [randomUUID(), club, member]);
      await db.exec(await sql('20261115040100_pending_club_requests'));
      await db.exec(await sql('20261115040100_pending_club_requests'));
      const requests = (await db.query('SELECT id FROM "ClubMembershipRequest" WHERE "clubId"=$1 AND "userId"=$2 AND kind=\'JOIN\'', [club, member])).rows;
      assert.equal(requests.length, 1);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM "Notification" WHERE "clubRequestId"=$1 AND "userId"=$2', [requests[0].id, owner])).rows[0].count, 1);
    });

    await t.test('retains legacy media and accepts authenticated Cloudinary references', async () => {
      assert.equal((await db.query('SELECT "mediaUrl" FROM "Story" WHERE "id"=$1', [oldStory])).rows[0].mediaUrl, `blob:${oldStory}.png`);
      assert.equal((await db.query('SELECT "videoUrl" FROM "Reel" WHERE "id"=$1', [oldReel])).rows[0].videoUrl, `upload:${oldReel}.mp4`);
      await db.query('UPDATE "Story" SET "mediaUrl"=$1 WHERE "id"=$2', [`cloudinary:${oldStory}.png`, oldStory]);
      await db.query('UPDATE "Reel" SET "videoUrl"=$1 WHERE "id"=$2', [`cloudinary:${oldReel}.mp4`, oldReel]);
      await assert.rejects(db.query('UPDATE "Story" SET "mediaUrl"=$1 WHERE "id"=$2', [`cloudinary:${oldStory}.mp4`, oldStory]),
        (error) => error.code === '23514');
    });
  } finally { await db.close(); }
});
