/**
 * Zeigt den Verlauf einer Partie Welle fuer Welle.
 *
 *   npm run verlauf -- --level level-01 --loadout armbrustturm,schleuder
 *
 * Gedacht fuer die Fehlersuche im Balancing: wo genau kippt eine Karte, und
 * womit haette der Spieler an dieser Stelle rechnen muessen.
 */

import { loadContent } from '../../src/data/index';
import type { Difficulty } from '../../src/sim/index';
import { createWorld, drainEvents, step, TICKS_PER_SECOND } from '../../src/sim/index';
import { AutoPlayer } from './autoplayer';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const content = loadContent();
const levelId = arg('level', 'level-01');
const difficulty = arg('difficulty', 'normal') as Difficulty;
const loadout = arg('loadout', 'armbrustturm,schleuder').split(',');

const level = content.levels.get(levelId);
if (level === undefined) throw new Error(`Unbekanntes Level: ${levelId}`);

console.log('');
console.log(`${level.name}, ${difficulty}, Loadout ${loadout.join(', ')}`);
console.log('');
console.log('Welle  Inhalt                                    Leben  Gold  Tuerme  durch');
console.log('-'.repeat(88));

for (let n = 1; n <= level.waves.length; n++) {
  const welle = level.waves[n - 1];
  if (welle === undefined) continue;
  const inhalt = welle.groups.map((g) => `${g.count}x ${g.enemyId}`).join(', ');
  console.log(`${String(n).padStart(4)}   ${inhalt}`);
}
console.log('');

const world = createWorld({ content, levelId, difficulty, seed: 1, loadout });
const player = new AutoPlayer(world, { loadout });
let durch = 0;
let letzteWelle = 0;

while (world.status !== 'gewonnen' && world.status !== 'verloren' && world.tick < 3600 * 60) {
  player.update(world);
  step(world);
  for (const ereignis of drainEvents(world)) {
    if (ereignis.type === 'gegner-durch') durch += 1;
    if (ereignis.type === 'welle-gestartet' && ereignis.wave !== letzteWelle) {
      letzteWelle = ereignis.wave;
      console.log(
        `${String(ereignis.wave).padStart(4)}   ${'Start'.padEnd(40)} ${String(world.lives).padStart(5)} ${String(world.gold).padStart(5)} ${String(world.occupiedSlots.size).padStart(7)} ${String(durch).padStart(6)}`,
      );
    }
  }
}

console.log('-'.repeat(88));
console.log(
  `${world.status}, ${world.lives} Leben, ${world.wavesCleared}/${world.waveCount} Wellen, ${(world.tick / TICKS_PER_SECOND).toFixed(0)} Sekunden`,
);
const tuerme = world.towers.items
  .filter((t) => t.active)
  .map((t) => `${t.defId} S${t.level}`)
  .join(', ');
console.log(`Tuerme: ${tuerme}`);
console.log('');
