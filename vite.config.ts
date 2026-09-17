import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@sim': resolvePath('./src/sim'),
      '@data': resolvePath('./src/data'),
      '@shared': resolvePath('./src/shared'),
      '@render': resolvePath('./src/render'),
      '@app': resolvePath('./src/app'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
