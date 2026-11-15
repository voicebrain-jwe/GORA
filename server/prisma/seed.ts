import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { BADGE_SEEDS, SPORT_SEEDS } from './seed-data';

// Idempotent: upserts by unique name, so it is safe to run more than once.
async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    for (const envFile of [
      resolve(process.cwd(), '..', '.env.local'),
      resolve(process.cwd(), '.env.local'),
      resolve(process.cwd(), '.env'),
    ]) {
      if (existsSync(envFile)) process.loadEnvFile(envFile);
    }
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });

  try {
    for (const sport of SPORT_SEEDS) {
      await prisma.sport.upsert({
        where: { name: sport.name },
        update: { description: sport.description },
        create: sport,
      });
    }

    for (const badge of BADGE_SEEDS) {
      const { name, ...details } = badge;
      await prisma.badge.upsert({
        where: { name },
        update: details,
        create: badge,
      });
    }

    console.log(
      `Seeded ${SPORT_SEEDS.length} sports and ${BADGE_SEEDS.length} badges.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Driver errors can echo connection details, so only a safe message is shown.
  console.error(
    'Seeding failed. Check that PostgreSQL is running and DATABASE_URL is set in .env.local or server/.env.',
  );
  process.exitCode = 1;
});
