/// <reference types="vitest" />

import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Standalone Vite development. vercel dev routes /api to server itself.
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Vercel Blob's browser shim otherwise captures Capacitor's patched fetch.
      // Keep binary storage requests in the WebView; JSON API calls stay native.
      'undici': fileURLToPath(new URL('./src/services/blob-fetch.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
