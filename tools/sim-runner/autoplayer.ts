/**
 * Ein einfacher automatischer Spieler.
 *
 * Er ersetzt keinen Menschen, aber er spielt vernuenftig genug, um zu messen,
 * ob ein Level ueberhaupt zu schaffen ist. Genau dafuer ist er da. Siehe
 * docs/03-architektur.md, Abschnitt Balancing durch Messung.
 *
 * Vorgehen:
 * 1. Bauplaetze werden einmal danach bewertet, wie viel Weg sie abdecken.
 * 2. Zuerst entsteht eine Grundabdeckung aus guenstigen Tuermen, die Schaden
 *    anrichten. Ein Mensch stellt zu Beginn mehrere billige Angriffstuerme auf
 *    und nicht einen teuren, und schon gar keine reinen Kontrolltuerme. Ein
 *    Messwerkzeug, das es anders macht, misst die falsche Untergrenze.
 * 3. Danach wird abwechselnd erweitert und ausgebaut. Kontrolltuerme bleiben
 *    auf hoechstens ein Drittel aller Tuerme begrenzt.
 * 4. Wellen laufen nach Uhr, ausser die erste. Mit `rushWaves` startet der
 *    Spieler jede Welle sofort und holt damit den Bonus fuer vorzeitigen
 *    Start. Das ergibt die obere statt der unteren Schranke.
 */

import type { TowerDef, World } from '@sim/index';
import { applyCommand, findTower } from '@sim/index';

export interface AutoPlayerOptions {
  /** Erlaubte Tuerme, entspricht dem Loadout aus dem Konzept. */
  readonly loadout: readonly string[];
  /** Nominale Reichweite fuer die Bewertung der Bauplaetze, in Kacheln. */
  readonly coverageRange?: number;
  /** So viele guenstige Tuerme entstehen, bevor teurer gebaut wird. */
  readonly baseCoverage?: number;
  /** Jede Welle sofort starten, statt die Uhr abzuwarten. */
  readonly rushWaves?: boolean;
}

interface RankedSlot {
  readonly index: number;
  readonly score: number;
}

export class AutoPlayer {
  private readonly slots: readonly RankedSlot[];
  /** Loadout, guenstigster Turm zuerst. */
  private readonly cheapFirst: readonly TowerDef[];
  /** Loadout, teuerster Turm zuerst. */
  private readonly costlyFirst: readonly TowerDef[];
  /** Loadout ohne Schadensausstoss, etwa Frostturm und Netzwerfer. */
  private readonly controlOnly: ReadonlySet<string>;
  private readonly baseCoverage: number;
  private readonly rushWaves: boolean;
  private started = false;

  constructor(world: World, options: AutoPlayerOptions) {
    this.slots = rankSlots(world, options.coverageRange ?? 3.5);
    this.baseCoverage = options.baseCoverage ?? 4;
    this.rushWaves = options.rushWaves ?? false;

    const defs: TowerDef[] = [];
    for (const id of options.loadout) {
      const def = world.content.towers.get(id);
      if (def === undefined) throw new Error(`Unbekannter Turm im Loadout: ${id}`);
      defs.push(def);
    }
    // Bei gleichem Preis entscheidet die Id, damit das Ergebnis reproduzierbar ist.
    const byCost = (a: TowerDef, b: TowerDef): number =>
      a.cost !== b.cost ? a.cost - b.cost : a.id.localeCompare(b.id);
    this.cheapFirst = defs.slice().sort(byCost);
    this.costlyFirst = defs.slice().sort((a, b) => -byCost(a, b));
    this.controlOnly = new Set(defs.filter((def) => def.damage <= 0).map((def) => def.id));
  }

  /** Wird vor jedem Simulationsschritt aufgerufen. */
  update(world: World): void {
    if (!this.started) {
      applyCommand(world, { type: 'welle-starten' });
      this.started = true;
    } else if (this.rushWaves && world.wavesCleared === world.wavesStarted) {
      applyCommand(world, { type: 'welle-starten' });
    }

    // Erst eine Grundabdeckung aus Angriffstuermen, danach in die Breite.
    const built = world.occupiedSlots.size;
    const controlBuilt = this.countControlTowers(world);
    const controlAllowed = controlBuilt < Math.floor(built / 3) + (built === 0 ? 0 : 1);
    const preference = built < this.baseCoverage ? this.cheapFirst : this.costlyFirst;

    for (const slot of this.slots) {
      if (world.occupiedSlots.has(slot.index)) continue;
      const affordable = preference.find(
        (def) =>
          def.cost <= world.gold &&
          (!this.controlOnly.has(def.id) || (controlAllowed && built >= this.baseCoverage)),
      );
      if (affordable === undefined) break;
      applyCommand(world, {
        type: 'bauen',
        slotIndex: slot.index,
        towerDefId: affordable.id,
      });
      return;
    }

    // Danach ausbauen, beginnend beim besten Bauplatz.
    for (const slot of this.slots) {
      const towerId = world.occupiedSlots.get(slot.index);
      if (towerId === undefined) continue;
      const tower = findTower(world, towerId);
      if (tower === null) continue;
      const def = world.content.towers.get(tower.defId);
      if (def === undefined) continue;
      const nextStep = def.upgrades[tower.level];
      if (nextStep === undefined) continue;
      const cost = Math.round(def.cost * nextStep.costFactor);
      if (cost > world.gold) continue;
      applyCommand(world, { type: 'ausbauen', towerId: tower.id });
      return;
    }
  }

  private countControlTowers(world: World): number {
    let count = 0;
    for (const towerId of world.occupiedSlots.values()) {
      const tower = findTower(world, towerId);
      if (tower !== null && this.controlOnly.has(tower.defId)) count += 1;
    }
    return count;
  }
}

/**
 * Bewertet jeden Bauplatz danach, wie viel Weg er in Reichweite hat.
 * Ein Platz an einer Kurve deckt mehr Weg ab als einer an einer Geraden und
 * bekommt dadurch von selbst den Vorzug.
 */
export function rankSlots(world: World, range: number): readonly RankedSlot[] {
  const sampleStep = 0.25;
  const rangeSquared = range * range;
  const samples: { x: number; y: number }[] = [];

  for (const route of world.routes) {
    for (let i = 1; i < route.points.length; i++) {
      const from = route.points[i - 1];
      const to = route.points[i];
      if (from === undefined || to === undefined) continue;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.round(length / sampleStep));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        samples.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
      }
    }
  }

  const ranked = world.level.buildSlots.map((slot, index) => {
    let score = 0;
    for (const sample of samples) {
      const dx = sample.x - slot.x;
      const dy = sample.y - slot.y;
      if (dx * dx + dy * dy <= rangeSquared) score += 1;
    }
    return { index, score };
  });

  // Bei Gleichstand entscheidet der Index, damit das Ergebnis reproduzierbar ist.
  return ranked.sort((a, b) => (b.score - a.score !== 0 ? b.score - a.score : a.index - b.index));
}
