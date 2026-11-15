-- Optional landmark / directions shown under the game location.
ALTER TABLE "Game" ADD COLUMN "locationDetails" TEXT;
ALTER TABLE "Game" ADD CONSTRAINT "Game_locationDetails_length" CHECK ("locationDetails" IS NULL OR char_length("locationDetails") <= 200);
