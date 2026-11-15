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
