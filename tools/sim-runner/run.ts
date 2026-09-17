/**
 * Befehlszeilenwerkzeug fuer Messlaeufe.
 *
 *   npm run sim -- --level level-01 --loadout armbrustturm,schleuder
 *   npm run sim -- --difficulty hart --loadout armbrustturm,balliste,frostturm
 */

import { loadContent } from '../../src/data/index';
import type { Difficulty } from '../../src/sim/index';
import { damageShare, simulate } from './simulate';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const content = loadContent();
const levelId = arg('level', 'level-01');
const difficulty = arg('difficulty', 'normal') as Difficulty;
const loadout = arg('loadout', 'armbrustturm,schleuder')
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);
const runs = Number.parseInt(arg('runs', '1'), 10);
const baseSeed = Number.parseInt(arg('seed', '1'), 10);
const rushWaves = process.argv.includes('--rush');

const level = content.levels.get(levelId);
if (level === undefined) {
  console.error(`Unbekanntes Level: ${levelId}`);
  console.error(`Vorhanden: ${[...content.levels.keys()].join(', ')}`);
  process.exit(1);
}

console.log('');
console.log(`Level      ${level.name} (${levelId})`);
console.log(`Schwierig  ${difficulty}`);
console.log(`Loadout    ${loadout.join(', ')}`);
console.log(`Laeufe     ${runs}`);
console.log(`Wellen     ${rushWaves ? 'sofort gestartet' : 'nach Uhr'}`);
console.log('');

let wins = 0;
let livesSum = 0;
let secondsSum = 0;
const damageTotals = new Map<string, number>();
const leakTotals = new Map<string, number>();

for (let run = 0; run < runs; run++) {
  const result = simulate({
    content,
    levelId,
    difficulty,
    loadout,
    seed: baseSeed + run,
    rushWaves,
  });

  if (result.won) wins += 1;
  livesSum += result.livesLeft;
  secondsSum += result.seconds;
  for (const [id, value] of result.damageByTower) {
    damageTotals.set(id, (damageTotals.get(id) ?? 0) + value);
  }
  for (const [id, value] of result.leaksByEnemy) {
    leakTotals.set(id, (leakTotals.get(id) ?? 0) + value);
  }

  if (runs === 1) {
    const stars = result.livesLeft >= level.lives ? 3 : result.livesLeft >= 15 ? 2 : 1;
    console.log(`Ergebnis   ${result.won ? 'gewonnen' : 'verloren'}`);
    console.log(`Leben      ${result.livesLeft} von ${level.lives}`);
    console.log(`Sterne     ${result.won ? stars : 0}`);
    console.log(`Wellen     ${result.wavesCleared} von ${result.waveCount}`);
    console.log(`Dauer      ${result.seconds.toFixed(1)} Sekunden`);
    console.log(`Erledigt   ${result.killed}`);
    console.log(`Durch      ${result.leaked}`);
    console.log(`Gold       ${result.goldEarned} verdient, ${result.goldSpent} ausgegeben`);
    if (result.firstLeakWave !== null) {
      console.log(`Erster Durchbruch in Welle ${result.firstLeakWave}`);
    }
    console.log('');
    console.log('Schadensanteil je Turm');
    for (const entry of damageShare(result)) {
      const bar = '#'.repeat(Math.max(1, Math.round(entry.share * 40)));
      console.log(`  ${entry.id.padEnd(16)} ${(entry.share * 100).toFixed(1).padStart(5)} %  ${bar}`);
    }
    if (result.leaksByEnemy.size > 0) {
      console.log('');
      console.log('Durchgekommen je Gegner');
      for (const [id, count] of result.leaksByEnemy) {
        console.log(`  ${id.padEnd(16)} ${count}`);
      }
    }
  }
}

if (runs > 1) {
  console.log(`Siegquote  ${((wins / runs) * 100).toFixed(1)} %`);
  console.log(`Leben      ${(livesSum / runs).toFixed(1)} im Schnitt`);
  console.log(`Dauer      ${(secondsSum / runs).toFixed(1)} Sekunden im Schnitt`);
  console.log('');
  let total = 0;
  for (const value of damageTotals.values()) total += value;
  console.log('Schadensanteil je Turm');
  for (const [id, value] of [...damageTotals.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id.padEnd(16)} ${((value / total) * 100).toFixed(1).padStart(5)} %`);
  }
}
console.log('');
