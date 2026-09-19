/**
 * Misst alle Level auf einen Blick.
 *
 *   npm run balance
 *   npm run balance -- --difficulty hart
 *
 * Fuer jedes Level wird mit mehreren sinnvollen Loadouts gerechnet und das
 * beste Ergebnis gezeigt. So sieht man sofort, welche Karte kippt.
 */

import { loadContent } from '../../src/data/index';
import type { Difficulty } from '../../src/sim/index';
import { simulate } from './simulate';
import { erwarteteBoni } from './erwartung';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const content = loadContent();
const difficulty = arg('difficulty', 'normal') as Difficulty;
const rush = process.argv.includes('--rush');

/** Loadouts, die ein aufmerksamer Spieler zur Verfuegung haette. */
const LOADOUTS: readonly (readonly string[])[] = [
  ['armbrustturm', 'schleuder'],
  ['armbrustturm', 'schleuder', 'frostturm', 'glutduese'],
  ['armbrustturm', 'balliste', 'frostturm', 'blitzspule'],
  ['armbrustturm', 'schleuder', 'frostturm', 'alchemieturm'],
  ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'],
  ['armbrustturm', 'schleuder', 'blitzspule', 'spaehturm'],
  ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'],
  ['blitzspule', 'balliste', 'spaehturm', 'leuchtfeuer'],
  ['armbrustturm', 'blitzspule', 'frostturm', 'ambossfalle'],
];

console.log('');
console.log(`Schwierigkeit ${difficulty}${rush ? ', Wellen sofort gestartet' : ''}`);
console.log('');
console.log('Level                      bestes Ergebnis   Leben  Wellen  Loadout');
console.log('-'.repeat(96));

/**
 * Wer Hart spielt, hat Normal schon hinter sich und entsprechend geforscht.
 * Ohne diesen Versatz misst man eine Lage, die es im Spiel nicht gibt.
 */
const VERSATZ: Readonly<Record<Difficulty, number>> = { leicht: 0, normal: 0, hart: 5, albtraum: 10 };

let gewonnen = 0;
let index = -1;
for (const levelId of content.levelReihenfolge) {
  index += 1;
  const level = content.levels.get(levelId);
  if (level === undefined) continue;

  let bestes: { leben: number; text: string; loadout: readonly string[]; wellen: string } | null =
    null;
  for (const loadout of LOADOUTS) {
    const ergebnis = simulate({
      content,
      levelId,
      difficulty,
      loadout,
      seed: 1,
      rushWaves: rush,
      boni: erwarteteBoni(index + VERSATZ[difficulty]),
    });
    const leben = ergebnis.won ? ergebnis.livesLeft : -1;
    if (bestes === null || leben > bestes.leben) {
      bestes = {
        leben,
        text: ergebnis.won ? 'gewonnen' : 'verloren',
        loadout,
        wellen: `${ergebnis.wavesCleared}/${ergebnis.waveCount}`,
      };
    }
  }
  if (bestes === null) continue;
  if (bestes.text === 'gewonnen') gewonnen += 1;

  const sterne =
    bestes.leben >= level.lives ? '***' : bestes.leben >= 15 ? '** ' : bestes.leben > 0 ? '*  ' : '   ';
  console.log(
    `${level.name.padEnd(24)}  ${bestes.text.padEnd(10)} ${sterne}  ${String(Math.max(0, bestes.leben)).padStart(3)}  ${bestes.wellen.padStart(6)}  ${bestes.loadout.join(',')}`,
  );
}

console.log('-'.repeat(96));
console.log(`${gewonnen} von ${content.levelReihenfolge.length} Leveln zu schaffen.`);
console.log('');
