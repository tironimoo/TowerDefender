/**
 * Zeigt die Schwierigkeitskurve ueber die ganze Kampagne.
 *
 *   npm run kurve
 *   npm run kurve -- --difficulty hart
 *
 * Anders als `npm run balance` zeigt dieses Werkzeug nicht nur das beste
 * Loadout, sondern jedes. Genau darauf kommt es beim Einstellen der Kurve an:
 * eine Karte, die nur mit einem einzigen starken Loadout zu schaffen ist, ist
 * nicht "gerade richtig", sondern eine Wand. Und eine Karte, die jedes Loadout
 * ohne einen einzigen Lebensverlust gewinnt, ist keine Aufgabe.
 *
 * Gelesen wird die Tabelle spaltenweise: links die einfachen Loadouts, rechts
 * die starken. Eine gesunde Kurve wandert von "fast alle gewinnen satt" nach
 * "nur die starken gewinnen knapp".
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

/** Von einfach nach stark. Die Reihenfolge traegt die Aussage der Tabelle. */
const LOADOUTS: readonly { readonly kurz: string; readonly tuerme: readonly string[] }[] = [
  { kurz: 'Start', tuerme: ['armbrustturm', 'schleuder'] },
  { kurz: 'Grund', tuerme: ['armbrustturm', 'schleuder', 'frostturm', 'glutduese'] },
  { kurz: 'Mittel', tuerme: ['armbrustturm', 'schleuder', 'frostturm', 'alchemieturm'] },
  { kurz: 'Blitz', tuerme: ['armbrustturm', 'schleuder', 'blitzspule', 'spaehturm'] },
  { kurz: 'Weit', tuerme: ['armbrustturm', 'balliste', 'frostturm', 'blitzspule'] },
  { kurz: 'Fein', tuerme: ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'] },
  { kurz: 'Stark', tuerme: ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'] },
  { kurz: 'Spitze', tuerme: ['blitzspule', 'balliste', 'spaehturm', 'leuchtfeuer'] },
];

const VERSATZ: Readonly<Record<Difficulty, number>> = { leicht: 0, normal: 0, hart: 5, albtraum: 10 };

console.log('');
console.log(`Schwierigkeit ${difficulty}. Zahl = verbliebene Leben, X = verloren.`);
console.log('');
console.log(
  'Karte                     St ' +
    LOADOUTS.map((l) => l.kurz.padStart(6)).join(' ') +
    '   gewonnen  Schnitt',
);
console.log('-'.repeat(104));

let gesamtGewonnen = 0;
let index = -1;
for (const levelId of content.levelReihenfolge) {
  index += 1;
  const level = content.levels.get(levelId);
  if (level === undefined) continue;

  const leben: number[] = [];
  for (const loadout of LOADOUTS) {
    const ergebnis = simulate({
      content,
      levelId,
      difficulty,
      loadout: loadout.tuerme,
      seed: 1,
      rushWaves: false,
      boni: erwarteteBoni(index + VERSATZ[difficulty]),
    });
    leben.push(ergebnis.won ? ergebnis.livesLeft : -1);
  }

  const siege = leben.filter((l) => l >= 0);
  if (siege.length > 0) gesamtGewonnen += 1;
  const schnitt =
    siege.length > 0 ? Math.round(siege.reduce((a, b) => a + b, 0) / siege.length) : 0;

  console.log(
    `${level.name.padEnd(24)}  ${level.staerke.toFixed(2).padStart(4)} ` +
      leben.map((l) => (l < 0 ? 'X' : String(l)).padStart(6)).join(' ') +
      `   ${String(siege.length).padStart(2)}/${LOADOUTS.length}   ${String(schnitt).padStart(6)}`,
  );
}

console.log('-'.repeat(104));
console.log(`${gesamtGewonnen} von ${content.levelReihenfolge.length} Karten zu schaffen.`);
console.log('');
