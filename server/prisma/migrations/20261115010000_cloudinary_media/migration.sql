ALTER TABLE "User" ADD COLUMN "profilePhotoStorageRef" TEXT,
                   ADD COLUMN "coverPhotoStorageRef" TEXT;
ALTER TABLE "ClubPhoto" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "ClubPhoto" ADD COLUMN "storageRef" TEXT;
ALTER TABLE "CloudMediaUpload" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'blob';
ALTER TABLE "CloudMediaUpload" ADD CONSTRAINT "CloudMediaUpload_provider_check"
  CHECK ("provider" IN ('blob', 'cloudinary'));

-- Preserve all legacy references while allowing new Cloudinary uploads.
ALTER TABLE "Story" DROP CONSTRAINT "Story_media_url_check";
ALTER TABLE "Story" ADD CONSTRAINT "Story_media_url_check" CHECK (
  (("mediaUrl" ~ '^https?://' AND char_length("mediaUrl") <= 2048)
   OR ("mediaType"='IMAGE' AND "mediaUrl" ~ '^(upload|blob|cloudinary):[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp|gif)$')
   OR ("mediaType"='VIDEO' AND "mediaUrl" ~ '^(upload|blob|cloudinary):[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(mp4|webm)$'))
  AND ("thumbnailUrl" IS NULL OR ("thumbnailUrl" ~ '^https?://' AND char_length("thumbnailUrl") <= 2048))
);
ALTER TABLE "Reel" DROP CONSTRAINT "Reel_video_url_check";
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_video_url_check" CHECK (
  (("videoUrl" ~ '^https?://' AND char_length("videoUrl") <= 2048)
   OR "videoUrl" ~ '^(upload|blob|cloudinary):[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(mp4|webm)$')
  AND ("thumbnailUrl" IS NULL OR ("thumbnailUrl" ~ '^https?://' AND char_length("thumbnailUrl") <= 2048))
);
