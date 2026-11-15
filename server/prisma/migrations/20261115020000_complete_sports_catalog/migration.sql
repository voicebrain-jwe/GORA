-- The deployment runs migrations, not the optional development seed.
-- Backfill the full catalog for new databases and installations with only Esports.
-- Preserve all existing IDs, descriptions, icons and admin activation choices.
INSERT INTO "Sport" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), catalog.name, catalog.description, true,
       timezone('UTC', now()), timezone('UTC', now())
FROM (VALUES
  ('Basketball', 'Pickup runs, 3x3, and full-court games.'),
  ('Volleyball', 'Indoor, beach, and casual court games.'),
  ('Badminton', 'Singles and doubles court sessions.'),
  ('Football', 'Futsal, 7-a-side, and full-field matches.'),
  ('Tennis', 'Singles, doubles, and rally sessions.'),
  ('Running', 'Group runs, intervals, and race training.'),
  ('Table Tennis', 'Ping pong matches and practice.'),
  ('Swimming', 'Laps, open water, and swim training.'),
  ('Cycling', 'Road rides, trails, and group spins.'),
  ('Esports', 'Competitive video games, team matches, and tournaments.'),
  ('Other', 'Any sport not listed yet.')
) AS catalog(name, description)
ON CONFLICT ("name") DO NOTHING;
