/**
 * Turmdefinitionen.
 *
 * Reine Daten. Kein Verhalten, keine Sonderfaelle im Code. Die Werte stammen
 * aus docs/05-startwerte.md und sind der Ausgangspunkt fuer das Balancing.
 *
 * Stand Abschnitt 1: sechs Tuerme, die mit den vorhandenen Mechaniken
 * vollstaendig funktionieren. Blitzspule, Kolbenstoss, Ambossfalle sowie die
 * drei Unterstuetzungstuerme brauchen eigene Mechaniken und kommen in
 * Abschnitt 4 dazu. Siehe docs/04-fahrplan.md.
 */

import type { TowerDef, TowerUpgradeDef } from '@sim/model/types';
import { NO_EFFECT } from '@sim/model/types';

/** Drei gleichfoermige Ausbaustufen. Siehe docs/05-startwerte.md. */
const STANDARD_UPGRADES: readonly TowerUpgradeDef[] = [
  { costFactor: 0.6, damageBonus: 0.55, rangeBonus: 0.08 },
  { costFactor: 1.0, damageBonus: 0.55, rangeBonus: 0.08 },
  { costFactor: 1.6, damageBonus: 0.55, rangeBonus: 0.08 },
];

export const TOWER_DEFS: readonly TowerDef[] = [
  {
    id: 'armbrustturm',
    name: 'Armbrustturm',
    cost: 100,
    damage: 12,
    fireRate: 1.2,
    range: 3.5,
    damageType: 'physisch',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 12,
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    upgrades: STANDARD_UPGRADES,
  },
  {
    id: 'balliste',
    name: 'Balliste',
    cost: 220,
    damage: 95,
    fireRate: 0.35,
    range: 7.0,
    damageType: 'physisch',
    targetsAir: true,
    // Durchschlaegt die Haelfte des Widerstands. Vollstaendige Immunitaet
    // bleibt immun, siehe resistanceFactor in src/sim/systems/damage.ts.
    armorPierce: 0.5,
    splashRadius: 0,
    projectileSpeed: 18,
    onHit: NO_EFFECT,
    defaultPolicy: 'staerkster',
    upgrades: STANDARD_UPGRADES,
  },
  {
    id: 'schleuder',
    name: 'Schleuder',
    cost: 140,
    damage: 30,
    fireRate: 0.6,
    range: 4.5,
    damageType: 'physisch',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 1.2,
    projectileSpeed: 8,
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    upgrades: STANDARD_UPGRADES,
  },
  {
    id: 'glutduese',
    name: 'Glutduese',
    cost: 160,
    damage: 8,
    fireRate: 4.0,
    range: 2.5,
    damageType: 'feuer',
    targetsAir: false,
    armorPierce: 0,
    // Naeherung fuer den Kegel aus dem Konzept. Ein echter Kegel braucht eine
    // eigene Trefferpruefung und kommt in Abschnitt 4.
    splashRadius: 1.0,
    projectileSpeed: 0,
    onHit: { slowFactor: 0, slowDuration: 0, burnDps: 6, burnDuration: 3 },
    defaultPolicy: 'erster',
    upgrades: STANDARD_UPGRADES,
  },
  {
    id: 'frostturm',
    name: 'Frostturm',
    cost: 130,
    damage: 0,
    fireRate: 1.0,
    range: 2.5,
    damageType: 'arkan',
    targetsAir: true,
    armorPierce: 0,
    // Verlangsamt alles im Umkreis, nicht nur das gewaehlte Ziel.
    splashRadius: 2.5,
    projectileSpeed: 0,
    onHit: { slowFactor: 0.35, slowDuration: 2.0, burnDps: 0, burnDuration: 0 },
    defaultPolicy: 'erster',
    upgrades: STANDARD_UPGRADES,
  },
  {
    id: 'netzwerfer',
    name: 'Netzwerfer',
    cost: 150,
    damage: 0,
    fireRate: 0.14,
    range: 4.0,
    damageType: 'arkan',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 10,
    // Eine Fesselung ist eine Verlangsamung um hundert Prozent.
    onHit: { slowFactor: 1.0, slowDuration: 2.0, burnDps: 0, burnDuration: 0 },
    defaultPolicy: 'staerkster',
    upgrades: STANDARD_UPGRADES,
  },
];
