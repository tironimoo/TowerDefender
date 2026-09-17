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
 * 3. Danach waechst die angestrebte Turmzahl mit der Wellennummer. Alles
 *    darueber hinaus geht in den Ausbau. Das trifft ungefaehr, was ein Mensch
 *    tut, und vermeidet beide Zerrbilder, den reinen Breitenbau wie den
 *    reinen Ausbau.
 * 4. Beim Bauen gewinnt der Turmtyp, von dem am wenigsten steht. Dadurch
 *    mischen sich die Schadensarten von selbst, statt dass ein einziger Typ
 *    die ganze Karte traegt.
 * 5. Kontrolltuerme bleiben auf hoechstens ein Drittel aller Tuerme begrenzt.
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
  /** Platz auf dem Weg. Nimmt nur Fallen auf. */
  readonly aufWeg: boolean;
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

    const built = world.occupiedSlots.size;

    // Erst eine Grundabdeckung aus Angriffstuermen.
    if (built < this.baseCoverage) {
      if (this.baue(world, this.cheapFirst, false)) return;
      return;
    }

    const controlBuilt = this.countControlTowers(world);
    const controlAllowed = controlBuilt < Math.floor(built / 3) + 1;

    // Erst in die Breite, bis die angestrebte Zahl steht, dann in die Tiefe.
    const zielAnzahl = this.baseCoverage + Math.floor(world.wavesStarted * 0.7);
    if (built < zielAnzahl && this.baue(world, this.nachHaeufigkeit(world), controlAllowed)) {
      return;
    }
    if (this.baueAus(world)) return;
    this.baue(world, this.nachHaeufigkeit(world), controlAllowed);
  }

  /** Turmtypen, von denen am wenigsten steht, zuerst. */
  private nachHaeufigkeit(world: World): readonly TowerDef[] {
    const anzahl = new Map<string, number>();
    for (const towerId of world.occupiedSlots.values()) {
      const tower = findTower(world, towerId);
      if (tower === null) continue;
      anzahl.set(tower.defId, (anzahl.get(tower.defId) ?? 0) + 1);
    }
    return [...this.costlyFirst].sort((a, b) => {
      const diff = (anzahl.get(a.id) ?? 0) - (anzahl.get(b.id) ?? 0);
      return diff !== 0 ? diff : b.cost - a.cost;
    });
  }

  private baue(world: World, preference: readonly TowerDef[], controlAllowed: boolean): boolean {
    for (const slot of this.slots) {
      if (world.occupiedSlots.has(slot.index)) continue;
      // Fallen gehoeren auf den Weg, alles andere daneben. Wer das mischt,
      // bekommt nur abgelehnte Befehle.
      const affordable = preference.find(
        (def) =>
          def.cost <= world.gold &&
          (def.special.kind === 'falle') === slot.aufWeg &&
          (!this.controlOnly.has(def.id) || controlAllowed),
      );
      if (affordable === undefined) continue;
      applyCommand(world, {
        type: 'bauen',
        slotIndex: slot.index,
        towerDefId: affordable.id,
      });
      return true;
    }
    return false;
  }

  /** Baut den Turm mit der besten Abdeckung aus, der sich leisten laesst. */
  private baueAus(world: World): boolean {
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
      return true;
    }
    return false;
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
    return { index, score, aufWeg: slot.aufWeg };
  });

  // Bei Gleichstand entscheidet der Index, damit das Ergebnis reproduzierbar ist.
  return ranked.sort((a, b) => (b.score - a.score !== 0 ? b.score - a.score : a.index - b.index));
}
