import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { appConfig } from './app.config';
import { validateEnv } from './env.validation';

const envFilePath = [
  // Neon deploy writes managed variables at the repository root.
  resolve(process.cwd(), '..', '.env.local'),
  resolve(process.cwd(), '.env.local'),
  // Keep the server's existing local configuration as a fallback.
  resolve(process.cwd(), '.env'),
].filter(existsSync);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath,
      load: [appConfig],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
