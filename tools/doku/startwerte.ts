/**
 * Erzeugt docs/05-startwerte.md aus den echten Daten.
 *
 *   npm run doku
 *
 * Eine Tabelle, die von Hand gepflegt wird, stimmt nach dem dritten
 * Balancing-Durchgang nicht mehr. Diese wird erzeugt und stimmt immer.
 */

import { writeFileSync } from 'node:fs';
import { loadContent } from '../../src/data/index';
import {
  EARLY_START_BONUS_PER_SECOND,
  SELL_REFUND,
  WAVE_GOLD_GROWTH,
  WAVE_HEALTH_GROWTH,
  RESISTANCE,
  DIFFICULTY,
} from '../../src/sim/index';
import { FORSCHUNG } from '../../src/meta/forschung';
import { HOECHSTSTUFE, WAHLSTUFEN, erfahrungFuerStufe } from '../../src/meta/meisterschaft';

const content = loadContent();
const zeilen: string[] = [];

const p = (text = ''): void => {
  zeilen.push(text);
};

p('# Startwerte');
p();
p('Diese Datei wird erzeugt. Nicht von Hand aendern, sondern die Daten unter');
p('`src/data` und dann `npm run doku` ausfuehren.');
p();
p(`Erzeugt am ${new Date().toISOString().slice(0, 10)}.`);
p();

p('## Einheiten');
p();
p('- Reichweite und Flaeche in Kacheln');
p('- Tempo in Kacheln pro Sekunde');
p('- Feuerrate in Schuessen pro Sekunde');
p('- Schaden je Treffer, sofern nicht anders vermerkt');
p();

p('## Tuerme');
p();
p('| Turm | Kosten | Schaden | Rate | Weite | Art | Luft | Besonderheit |');
p('|---|---|---|---|---|---|---|---|');
for (const turm of content.towers.values()) {
  const besonderheit: string[] = [];
  if (turm.splashRadius > 0) besonderheit.push(`Flaeche ${turm.splashRadius}`);
  if (turm.armorPierce > 0) besonderheit.push(`Durchschlag ${Math.round(turm.armorPierce * 100)} %`);
  if (turm.onHit.slowFactor > 0) {
    besonderheit.push(
      `verlangsamt ${Math.round(turm.onHit.slowFactor * 100)} % fuer ${turm.onHit.slowDuration} s`,
    );
  }
  if (turm.onHit.burnDps > 0) {
    besonderheit.push(`Brand ${turm.onHit.burnDps}/s fuer ${turm.onHit.burnDuration} s`);
  }
  if (turm.special.kind === 'kette') {
    besonderheit.push(
      `${turm.special.jumps} Spruenge, je ${Math.round(turm.special.falloff * 100)} % schwaecher`,
    );
  }
  if (turm.special.kind === 'rueckstoss') besonderheit.push(`Rueckstoss ${turm.special.distance}`);
  if (turm.special.kind === 'falle') besonderheit.push('steht auf dem Weg');
  if (turm.special.kind === 'aura') {
    const a = turm.special.effect;
    if (a.damageBonus > 0) besonderheit.push(`+${Math.round(a.damageBonus * 100)} % Schaden im Umkreis`);
    if (a.rangeBonus > 0) besonderheit.push(`+${Math.round(a.rangeBonus * 100)} % Reichweite im Umkreis`);
    if (a.armorShred > 0) besonderheit.push(`-${Math.round(a.armorShred * 100)} % Panzerung`);
    if (a.damageAmp > 0) besonderheit.push(`+${Math.round(a.damageAmp * 100)} % erlittener Schaden`);
    if (a.reveal) besonderheit.push('deckt Unsichtbare auf');
  }
  if (turm.forschung !== null) besonderheit.push('Forschung noetig');

  p(
    `| ${turm.name} | ${turm.cost} | ${turm.damage} | ${turm.fireRate} | ${turm.range} | ${turm.damageType} | ${turm.targetsAir ? 'ja' : 'nein'} | ${besonderheit.join(', ') || '—'} |`,
  );
}
p();

const stufen = content.towers.values().next().value?.upgrades ?? [];
p('## Ausbau');
p();
p('Drei Stufen. Die Zuwaechse multiplizieren sich: eine Stufe mit plus 55');
p('Prozent erhoeht den bereits erreichten Wert.');
p();
p('| Stufe | Kosten als Anteil des Grundpreises | Schaden | Reichweite |');
p('|---|---|---|---|');
stufen.forEach((stufe, index) => {
  p(
    `| ${index + 1} | ${Math.round(stufe.costFactor * 100)} % | +${Math.round(stufe.damageBonus * 100)} % | +${Math.round(stufe.rangeBonus * 100)} % |`,
  );
});
p();
p(`Verkauf erstattet ${Math.round(SELL_REFUND * 100)} Prozent des Investierten.`);
p('Die Forschung kann das erhoehen.');
p();

p('## Gegner');
p();
p('| Gegner | Leben | Tempo | Panzerung | Gold | Besonderheit |');
p('|---|---|---|---|---|---|');
for (const gegner of content.enemies.values()) {
  const besonderheit: string[] = [];
  if (gegner.flying) besonderheit.push('fliegt');
  if (gegner.invisible) besonderheit.push('unsichtbar');
  if (gegner.immun.length > 0) besonderheit.push(`immun gegen ${gegner.immun.join(', ')}`);
  if (gegner.schild > 0) besonderheit.push(`Schild ${gegner.schild}`);
  const v = gegner.behaviour;
  switch (v.kind) {
    case 'teilt':
      besonderheit.push(`zerfaellt in ${v.count} ${v.childId}`);
      break;
    case 'schildet':
      besonderheit.push(`schildet ${v.shield} im Umkreis ${v.radius} alle ${v.interval} s`);
      break;
    case 'heilt':
      besonderheit.push(`heilt ${v.amount} im Umkreis ${v.radius} alle ${v.interval} s`);
      break;
    case 'springt':
      besonderheit.push(`springt ${v.distance} Kacheln alle ${v.interval} s`);
      break;
    case 'rast':
      besonderheit.push(`unter ${Math.round(v.threshold * 100)} % Leben ${v.factor}fach schnell`);
      break;
    case 'stoert':
      besonderheit.push(`legt Tuerme im Umkreis ${v.radius} fuer ${v.duration} s still`);
      break;
    case 'sprengt':
      besonderheit.push(`detoniert einmal, legt Tuerme im Umkreis ${v.radius} still`);
      break;
    default:
      break;
  }
  if (gegner.boss !== null) besonderheit.push(`Boss mit ${gegner.boss.phasen.length} Phasen`);
  p(
    `| ${gegner.name} | ${gegner.health} | ${gegner.speed} | ${gegner.armor} | ${gegner.gold} | ${besonderheit.join(', ') || '—'} |`,
  );
}
p();

p('## Panzerung gegen Schadensart');
p();
p('| Panzerung | physisch | feuer | arkan |');
p('|---|---|---|---|');
for (const [panzerung, werte] of Object.entries(RESISTANCE)) {
  p(
    `| ${panzerung} | ${Math.round(werte.physisch * 100)} % | ${Math.round(werte.feuer * 100)} % | ${Math.round(werte.arkan * 100)} % |`,
  );
}
p();
p('Durchschlag hebt einen Teil des Widerstands auf. Eine vollstaendige');
p('Immunitaet bleibt jedoch immun.');
p();

p('## Karten');
p();
p('| Nr | Karte | Region | Groesse | Wege | Bauplaetze | Fallen | Wellen | Startgold | Albtraum |');
p('|---|---|---|---|---|---|---|---|---|---|');
content.levelReihenfolge.forEach((id, index) => {
  const level = content.levels.get(id);
  if (level === undefined) return;
  const plaetze = level.buildSlots.filter((slot) => !slot.aufWeg).length;
  const fallen = level.buildSlots.length - plaetze;
  p(
    `| ${index + 1} | ${level.name} | ${level.region} | ${level.breite}×${level.hoehe} | ${level.paths.length} | ${plaetze} | ${fallen} | ${level.waves.length} | ${level.startGold} | ${level.albtraumMutator} |`,
  );
});
p();

p('## Steigerung und Wirtschaft');
p();
p('| Groesse | Wert |');
p('|---|---|');
p(`| Leben je Welle | mal ${WAVE_HEALTH_GROWTH} gegenueber der vorherigen |`);
p(`| Gold je Welle | mal ${WAVE_GOLD_GROWTH} |`);
p(`| Vorzeitiger Wellenstart | ${EARLY_START_BONUS_PER_SECOND} Gold je verbleibender Sekunde |`);
p('| Leben je Karte | 20, Bosse kosten alle auf einmal |');
p();
p('Bosse werden bewusst nicht mit der Wellensteigerung skaliert. Sie sind fuer');
p('ihre Karte entworfen.');
p();

p('## Schwierigkeitsgrade');
p();
p('| Grad | Leben | Tempo | Gold | Zusatzwellen |');
p('|---|---|---|---|---|');
for (const [grad, werte] of Object.entries(DIFFICULTY)) {
  p(
    `| ${grad} | ${Math.round(werte.healthFactor * 100)} % | ${Math.round(werte.speedFactor * 100)} % | ${Math.round(werte.goldFactor * 100)} % | +${werte.extraWaves} |`,
  );
}
p();
p('Auf Albtraum traegt jede Karte zusaetzlich ihren eigenen Mutator.');
p();

p('## Mutatoren');
p();
p('| Mutator | Wirkung |');
p('|---|---|');
for (const mutator of content.mutators.values()) {
  p(`| ${mutator.name} | ${mutator.beschreibung} |`);
}
p();

p('## Forschung');
p();
p(`${FORSCHUNG.length} Knoten, zusammen ${FORSCHUNG.reduce((s, k) => s + k.kosten, 0)} Splitter.`);
p();
p('| Knoten | Ast | Kosten | Wirkung |');
p('|---|---|---|---|');
for (const knoten of FORSCHUNG) {
  p(`| ${knoten.name} | ${knoten.ast} | ${knoten.kosten} | ${knoten.beschreibung} |`);
}
p();

p('## Meisterschaft');
p();
p(`Hoechststufe ${HOECHSTSTUFE}. Wahl auf den Stufen ${WAHLSTUFEN.join(', ')}.`);
p();
p('| Stufe | Erfahrung insgesamt |');
p('|---|---|');
for (const stufe of [2, 5, 10, 15, 20]) {
  p(`| ${stufe} | ${erfahrungFuerStufe(stufe).toLocaleString('de-DE')} |`);
}
p();
p('Erfahrung entsteht nur aus tatsaechlich angerichtetem Schaden. Ein');
p('mitgeschleppter Turm steigt nicht auf.');
p();

p('## Pruefungen, die das Simulationswerkzeug absichert');
p();
p('Siehe `tests/balance.test.ts` und `npm run balance`.');
p();
p('1. Karte 1 ist mit Armbrustturm und Schleuder allein zu gewinnen.');
p('2. Alle zehn Karten sind auf Normal mit einem passenden Loadout zu schaffen.');
p('3. Ein Loadout ohne Schadensquelle kann nie gewinnen.');
p('4. In den Leerlanden scheitert ein rein physischer Aufbau, ein arkaner nicht.');
p('5. Kein einzelner Turm traegt mehr als 85 Prozent des Schadens.');
p('6. Gleicher Ausgangswert ergibt immer dasselbe Ergebnis.');

writeFileSync('docs/05-startwerte.md', `${zeilen.join('\n')}\n`);
console.log(`docs/05-startwerte.md geschrieben, ${zeilen.length} Zeilen.`);
