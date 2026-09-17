/**
 * Selbsttest des Simulationskerns.
 *
 * Rechnet Level 1 ohne Grafik durch und liefert ein paar Zeilen Text. Das ist
 * der sichtbare Beweis, dass Abschnitt 1 auf dem Geraet funktioniert, an dem
 * die Seite geoeffnet wird. Die Darstellung des Spiels kommt in Abschnitt 2.
 */

import { loadContent } from '@data/index';
import { damageShare, simulate } from '../../tools/sim-runner/simulate';

export interface SelbsttestZeile {
  readonly label: string;
  readonly wert: string;
}

export function selbsttest(): SelbsttestZeile[] {
  const begonnen = performance.now();
  const content = loadContent();
  const ergebnis = simulate({
    content,
    levelId: 'level-01',
    difficulty: 'normal',
    loadout: ['armbrustturm', 'schleuder', 'glutduese', 'frostturm'],
    seed: 1,
  });
  const gebraucht = performance.now() - begonnen;
  const anteile = damageShare(ergebnis)
    .map((eintrag) => `${eintrag.id} ${(eintrag.share * 100).toFixed(0)}%`)
    .join(', ');

  return [
    { label: 'Inhalte', wert: `${content.towers.size} Tuerme, ${content.enemies.size} Gegner` },
    { label: 'Level', wert: 'Lichtung am Moorbach' },
    { label: 'Ergebnis', wert: ergebnis.won ? 'gewonnen' : 'verloren' },
    { label: 'Leben', wert: `${ergebnis.livesLeft} von 20` },
    { label: 'Wellen', wert: `${ergebnis.wavesCleared} von ${ergebnis.waveCount}` },
    { label: 'Erledigt', wert: `${ergebnis.killed} Gegner` },
    { label: 'Spielzeit', wert: `${ergebnis.seconds.toFixed(0)} Sekunden` },
    { label: 'Rechenzeit', wert: `${gebraucht.toFixed(0)} Millisekunden` },
    { label: 'Schaden', wert: anteile },
  ];
}
