import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// The Prisma 7 CLI does not load .env files on its own.
for (const envFile of [
  resolve(process.cwd(), '..', '.env.local'),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Read directly so `prisma generate` works before DATABASE_URL is set.
    url: migrationUrl(),
  },
});

/** Migrations need a session connection; runtime traffic keeps using the pooler. */
function migrationUrl(): string | undefined {
  const configured =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!configured) return undefined;
  const url = new URL(configured);
  if (url.hostname.endsWith('.neon.tech'))
    url.hostname = url.hostname.replace('-pooler.', '.');
  return url.toString();
}
