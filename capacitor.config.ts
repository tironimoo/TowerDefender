/**
 * Verpackung als App.
 *
 * Das Spiel laeuft im Browser und wird von Capacitor in eine native Huelle
 * gesteckt. Es bleibt dieselbe Codebasis, siehe docs/03-architektur.md.
 *
 * Plattformen anlegen:
 *   npm run build
 *   npx cap add android
 *   npx cap add ios
 *   npm run app:sync
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.towerdefender.spiel',
  appName: 'TowerDefender',
  webDir: 'dist',
  android: {
    // Der Klotz-Stil lebt von harten Kanten. Keine Glaettung beim Skalieren.
    backgroundColor: '#0b0e14',
  },
  ios: {
    backgroundColor: '#0b0e14',
    contentInset: 'never',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Preferences: {
      group: 'TowerDefenderSpielstand',
    },
  },
};

export default config;
