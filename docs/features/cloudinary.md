# Cloudinary media storage

New Story/Reel uploads go directly from the browser or native WebView to
Cloudinary using parameters signed by the authenticated GORA API. Post photos,
profile photos/covers and club photos/covers use the existing bounded photo API
and are then saved to Cloudinary by the server. PostgreSQL stores references and
audiences; these new uploads do not store image/video bytes in PostgreSQL.

## Activate

In the Cloudinary Console, obtain the product environment's Cloud Name, API Key
and API Secret. Add these server variables in Vercel's **Environment Variables**:

| Name | Value |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloud Name |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |

Select the environment being deployed. Use separate credentials for test and
production when available. Never use `VITE_` prefixes or commit real values.
Local development can put them in ignored `server/.env` or root `.env.local`.
`DATABASE_URL` and `JWT_SECRET` remain required.

Deploy the updated API and client together. The existing `build:vercel` command
applies `20261115010000_cloudinary_media`; it adds nullable photo references and
an upload provider field without removing existing bytes or media references.
Test migrations on an isolated database branch before production. Rebuild and
install the native APK to enable the Cloudinary direct-upload client there.

No unsigned upload preset is required. All three variables must be set; partial
configuration fails clearly instead of silently changing the storage provider.

## Privacy and compatibility

Assets are uploaded as `authenticated`, with random server-selected public IDs,
fixed format and `overwrite=false`. The API secret never reaches the client.
Completion verifies size, MIME type and file headers before atomically claiming
the owner's unexpired upload ticket. Client-provided Cloudinary URLs are ignored.
Story expiry, audience, blocks, ownership and deletion checks remain in the API.
Playback uses server-side signed original asset URLs and forwards video ranges;
the storage URLs are never returned as public media URLs.

Old Vercel Blob media remains accessible using `BLOB_READ_WRITE_TOKEN`; keep that
variable and store until old media has been explicitly migrated. Existing database
photos remain readable and are replaced by Cloudinary files only when re-uploaded.
This change does not copy or delete existing assets. Without Cloudinary variables,
the previous Blob/database/local behavior is preserved.

Club profile/cover uploads finish in parallel before opening a database
transaction. Only metadata writes, owner membership and chat creation happen in
the transaction; a photo-upload failure creates no club, and a database failure
cleans up the newly uploaded photos. Cloudinary server uploads have a bounded
timeout and log only safe status/configuration hints, never SDK error details.

Chat attachments keep their existing participant-checked database storage. They
are not changed by this content/profile media integration.

Post photos remain soft-deleted along with their post; storage is retained for
that existing behavior. Failed cleanup or expired abandoned tickets may leave
unreferenced authenticated assets in Cloudinary; periodic reconciliation is a
separate operational task. An upload signature can remain valid for Cloudinary's
signature window, but GORA tickets expire after 15 minutes and cannot be reused
to publish content.

Verify photo Story, video Story, Reel >4 MB, private post, profile/club photo,
video seeking, cancellation, rejected types, audience denial and legacy media
against the configured account before declaring the integration live.

References: [signed uploads](https://cloudinary.com/documentation/upload_images),
[authenticated delivery](https://cloudinary.com/documentation/control_access_to_media).
