/**
 * Prueft, ob jeder Turm von jedem Bauplatz aus ueberhaupt den Weg erreicht.
 *
 *   npm run reichweite
 *
 * Bauplaetze liegen in festem Abstand neben dem Weg. Ist die Reichweite eines
 * Turms kleiner als dieser Abstand, trifft er von dort aus nichts - er ist
 * nicht schwach, sondern wirkungslos. Das faellt beim Spielen als "der Turm
 * taugt nichts" auf, ohne dass man den Grund sieht.
 *
 * Gemessen wird zweierlei: auf wie vielen Plaetzen ein Turm den Weg ueberhaupt
 * erreicht, und wie viel Weglaenge er im Schnitt abdeckt. Das zweite sagt, wie
 * lange ein Gegner in seiner Reichweite bleibt, und das entscheidet ueber den
 * tatsaechlichen Schaden mehr als jede Zahl im Datenblatt.
 */

import { loadContent } from '../../src/data/index';
import type { LevelDef, TowerDef } from '../../src/sim/index';

const content = loadContent();

/** Punkte entlang aller Wege, in Schritten von einem Zehntel einer Kachel. */
function wegPunkte(level: LevelDef): { x: number; y: number }[] {
  const punkte: { x: number; y: number }[] = [];
  for (const pfad of level.paths) {
    for (let i = 1; i < pfad.length; i++) {
      const a = pfad[i - 1];
      const b = pfad[i];
      if (a === undefined || b === undefined) continue;
      const laenge = Math.hypot(b.x - a.x, b.y - a.y);
      const schritte = Math.max(1, Math.round(laenge * 10));
      for (let s = 0; s < schritte; s++) {
        const t = s / schritte;
        punkte.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
  }
  return punkte;
}

interface Befund {
  /** Anteil der Bauplaetze, von denen der Turm den Weg ueberhaupt erreicht. */
  readonly erreicht: number;
  /** Abgedeckte Weglaenge in Kacheln, gemittelt ueber alle Bauplaetze. */
  readonly deckung: number;
}

function miss(level: LevelDef, def: TowerDef): Befund {
  const punkte = wegPunkte(level);
  const plaetze = level.buildSlots.filter((slot) => slot.aufWeg === (def.special.kind === 'falle'));
  if (plaetze.length === 0 || punkte.length === 0) return { erreicht: 0, deckung: 0 };

  let mitTreffer = 0;
  let summe = 0;
  for (const slot of plaetze) {
    let getroffen = 0;
    for (const punkt of punkte) {
      if (Math.hypot(punkt.x - slot.x, punkt.y - slot.y) <= def.range) getroffen++;
    }
    if (getroffen > 0) mitTreffer++;
    summe += getroffen * 0.1;
  }
  return { erreicht: mitTreffer / plaetze.length, deckung: summe / plaetze.length };
}

const tuerme = [...content.towers.values()].sort((a, b) => a.range - b.range);

console.log('');
console.log('Anteil der Bauplaetze, von denen der Turm den Weg ueberhaupt erreicht.');
console.log('Darunter in Klammern die abgedeckte Weglaenge in Kacheln, im Schnitt.');
console.log('');
process.stdout.write('Turm             Weite  ');
for (const levelId of content.levelReihenfolge) {
  process.stdout.write(levelId.replace('level-', 'K').padStart(7));
}
console.log('    Schnitt');
console.log('-'.repeat(100));

for (const def of tuerme) {
  process.stdout.write(`${def.id.padEnd(16)}${def.range.toFixed(1).padStart(5)}  `);
  let summeAnteil = 0;
  let summeDeckung = 0;
  for (const levelId of content.levelReihenfolge) {
    const level = content.levels.get(levelId);
    if (level === undefined) continue;
    const b = miss(level, def);
    summeAnteil += b.erreicht;
    summeDeckung += b.deckung;
    process.stdout.write(`${Math.round(b.erreicht * 100).toString().padStart(6)}%`);
  }
  const n = content.levelReihenfolge.length;
  console.log(
    `  ${Math.round((summeAnteil / n) * 100).toString().padStart(3)}% (${(summeDeckung / n).toFixed(1)})`,
  );
}
console.log('');
