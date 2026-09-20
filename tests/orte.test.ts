/**
 * Hoehle und Burg muessen auf festem Boden stehen.
 *
 * Beim ersten Anlauf standen sie in der Luft, und zwar aus zwei Gruenden
 * gleichzeitig: der Boden reichte nicht bis zu den Wegkacheln ausserhalb der
 * Karte, und der Schritt vom Pfadanfang nach aussen nahm die Laenge der
 * ersten Strecke statt nur ihrer Richtung - ein Pfad ist ein Polygonzug,
 * zwischen zwei Punkten koennen zehn Kacheln liegen.
 *
 * Beides faellt in einem Bild nur auf, wenn man genau hinsieht, und auf
 * neun von zehn Karten sieht man gar nicht hin. Deshalb steht es hier.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '@data/index';
import { baueBoden } from '@render3d/boden';
import { REGIONEN } from '@render3d/welt3d';
import { orteDerKarte, SCHRITT_NACH_AUSSEN } from '@render3d/orte';

const content = loadContent();

describe('Hoehle und Burg', () => {
  it('stehen auf jeder Karte auf festem Boden', () => {
    const schwebend: string[] = [];
    for (const [id, level] of content.levels) {
      const farben = REGIONEN[level.region];
      const boden = baueBoden(level, {
        gras: farben.boden,
        weg: farben.weg,
        bett: farben.bett,
        fels: farben.sockel,
        boeschung: farben.boeschung,
      });
      for (const ort of orteDerKarte(level)) {
        const hoehe = boden.hoeheBei(ort.x, ort.z);
        // Der Weg liegt bei 0.085; alles deutlich darunter haengt ueber der
        // Boeschung oder daneben.
        if (hoehe < 0) schwebend.push(`${id} ${ort.art} (${ort.x.toFixed(2)}, ${ort.z.toFixed(2)}) = ${hoehe.toFixed(2)}`);
      }
    }
    expect(schwebend).toEqual([]);
  });

  it('gibt jeder Karte mindestens eine Hoehle und eine Burg', () => {
    const fehlt: string[] = [];
    for (const [id, level] of content.levels) {
      const orte = orteDerKarte(level);
      if (!orte.some((o) => o.art === 'hoehle')) fehlt.push(`${id} ohne Hoehle`);
      if (!orte.some((o) => o.art === 'burg')) fehlt.push(`${id} ohne Burg`);
    }
    expect(fehlt).toEqual([]);
  });

  it('setzt den Schritt nach aussen kurz genug, dass er auf der Zunge bleibt', () => {
    // Die Wegkacheln ausserhalb reichen eine Kachel weit. Ein Schritt von
    // mehr als einer halben Kachel plus halber Kachelbreite faende dort
    // keinen Boden mehr.
    expect(SCHRITT_NACH_AUSSEN).toBeLessThan(1);
  });
});
