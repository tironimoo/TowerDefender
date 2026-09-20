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
      '@render3d': resolvePath('./src/render3d'),
      '@app': resolvePath('./src/app'),
      '@meta': resolvePath('./src/meta'),
      '@platform': resolvePath('./src/platform'),
      '@ui': resolvePath('./src/ui'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        // Zwei Seiten: das Spiel, und der Prototyp des neuen Stils. Vite
        // trennt die Buendel selbst, das Spiel traegt Three.js also nicht mit.
        spiel: resolvePath('./index.html'),
        prototyp: resolvePath('./prototyp/index.html'),
        // Die Werkstatt zeigt einzelne Modelle nebeneinander, ohne Karte und
        // ohne Nachbearbeitung - der einzige Aufbau, in dem sich ein Urteil
        // ueber die Form von einem Urteil ueber das Bild trennen laesst.
        werkstatt: resolvePath('./prototyp/werkstatt.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
