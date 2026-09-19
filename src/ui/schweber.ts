/**
 * Bau- und Turmmenue.
 *
 * Erscheint ueber dem angetippten Bauplatz oder Turm. Zeigt beim Bauen die
 * Tuerme des Loadouts mit Preis, beim eigenen Turm Kennwerte, Ausbau,
 * Spezialfaehigkeiten, Zielprioritaet und Verkauf.
 *
 * Zwei Dinge sind hier wichtiger, als sie aussehen:
 *
 * 1. Das Menue aktualisiert sich waehrend es offen ist. Wer beim Ausbauen auf
 *    Gold wartet, soll es nicht schliessen und wieder oeffnen muessen.
 * 2. Die Verkaufstaste behaelt Platz und Groesse, egal in welchem Zustand der
 *    Turm ist. Sonst rutscht sie beim letzten Ausbau unter den Finger, der
 *    gerade noch die Ausbautaste getroffen hat.
 */

import type { FaehigkeitDef, TargetPolicy, TowerDef, Tower, World } from '@sim/index';
import { ausbauKosten, faehigkeitKosten, faehigkeitRang } from '@sim/index';
import { el, formatiere, leere, taste } from './bausteine';

export interface SchweberRueckrufe {
  readonly beiBauen: (slotIndex: number, towerDefId: string) => void;
  readonly beiAusbauen: (towerId: number) => void;
  readonly beiFaehigkeit: (towerId: number, index: number) => void;
  readonly beiVerkaufen: (towerId: number) => void;
  readonly beiZiel: (towerId: number, policy: TargetPolicy) => void;
  /**
   * Zeigt die Reichweite eines Turms, waehrend der Finger auf seiner Taste
   * liegt. Ohne diese Vorschau baut man auf gut Glueck.
   */
  readonly beiVorschau: (towerDefId: string | null) => void;
}

/** Kurze Beschriftungen: auf dem Handy zaehlt jede Zeile Hoehe. */
const ZIELE: readonly { readonly id: TargetPolicy; readonly kurz: string; readonly name: string }[] =
  [
    { id: 'erster', kurz: 'Erst', name: 'Erster auf dem Weg' },
    { id: 'letzter', kurz: 'Letzt', name: 'Letzter auf dem Weg' },
    { id: 'staerkster', kurz: 'Stark', name: 'Staerkster' },
    { id: 'schwaechster', kurz: 'Schwach', name: 'Schwaechster' },
    { id: 'naechster', kurz: 'Nah', name: 'Naechster' },
  ];

/** Rang als gefuellte und leere Punkte. */
function raengePunkte(rang: number, hoechst: number): string {
  return '●'.repeat(rang) + '○'.repeat(Math.max(0, hoechst - rang));
}

interface TurmAnsicht {
  readonly towerId: number;
  /** Aufbau, bei dem die Anordnung gleich bleiben kann. */
  readonly bauart: string;
  readonly kennwerte: HTMLElement;
  readonly stufe: HTMLElement;
  readonly ausbau: HTMLButtonElement;
  readonly verkauf: HTMLButtonElement;
  readonly faehigkeiten: HTMLButtonElement[];
  readonly zielTasten: Map<TargetPolicy, HTMLButtonElement>;
}

export class Schweber {
  readonly element: HTMLElement;
  private offen = false;
  private turmAnsicht: TurmAnsicht | null = null;
  /** Merkt sich, wofuer das Baumenue zuletzt gebaut wurde. */
  private bauplatzSchluessel = '';

  constructor(private readonly rueckrufe: SchweberRueckrufe) {
    this.element = el('div', { class: 'tafel schweber' });
    this.element.style.display = 'none';
  }

  verbirg(): void {
    this.offen = false;
    this.turmAnsicht = null;
    this.bauplatzSchluessel = '';
    this.element.style.display = 'none';
    this.rueckrufe.beiVorschau(null);
  }

  get istOffen(): boolean {
    return this.offen;
  }

  /**
   * Setzt den Schweber ueber den gewaehlten Punkt.
   *
   * Passt er dort nicht hin, klappt er nach unten und rueckt an den Rand.
   * Sonst haengt er auf kleinen Bildschirmen halb ausserhalb.
   */
  setzePosition(x: number, y: number): void {
    if (!this.offen) return;
    const masse = this.element.getBoundingClientRect();
    const breite = masse.width;
    const hoehe = masse.height;
    const randOben = 54;
    const randUnten = 78;

    let links = x - breite / 2;
    let oben = y - hoehe - 26;
    if (oben < randOben) oben = y + 30;

    links = Math.max(8, Math.min(window.innerWidth - breite - 8, links));
    oben = Math.max(randOben, Math.min(window.innerHeight - hoehe - randUnten, oben));

    this.element.style.left = `${links}px`;
    this.element.style.top = `${oben}px`;
  }

  // --- Bauplatz ------------------------------------------------------------

  zeigeBauplatz(world: World, slotIndex: number, loadout: readonly string[]): void {
    const schluessel = `${slotIndex}|${loadout.join(',')}`;
    this.offen = true;
    this.turmAnsicht = null;
    this.element.style.display = '';
    if (schluessel === this.bauplatzSchluessel) {
      this.aktualisierePreise(world);
      return;
    }
    this.bauplatzSchluessel = schluessel;
    leere(this.element);

    const slot = world.level.buildSlots[slotIndex];
    const nurFallen = slot?.aufWeg === true;

    this.element.append(
      el('div', { class: 'kopf' }, [
        el('span', { class: 'name' }, [nurFallen ? 'Platz auf dem Weg' : 'Bauplatz']),
      ]),
    );

    const wahl = el('div', { class: 'turmwahl' });
    let passende = 0;
    for (const id of loadout) {
      const def = world.content.towers.get(id);
      if (def === undefined) continue;
      const istFalle = def.special.kind === 'falle';
      if (istFalle !== nurFallen) continue;
      passende += 1;

      const knopf = el('button', { type: 'button', 'data-kosten': def.cost }, [
        el('span', {}, [def.name]),
        el('span', { class: 'preis' }, [`${def.cost} G`]),
      ]);
      knopf.addEventListener('click', (ereignis) => {
        ereignis.stopPropagation();
        this.rueckrufe.beiVorschau(null);
        this.rueckrufe.beiBauen(slotIndex, id);
      });
      knopf.addEventListener('pointerdown', () => this.rueckrufe.beiVorschau(id));
      knopf.addEventListener('pointerenter', () => this.rueckrufe.beiVorschau(id));
      knopf.addEventListener('pointerleave', () => this.rueckrufe.beiVorschau(null));
      knopf.addEventListener('pointercancel', () => this.rueckrufe.beiVorschau(null));
      wahl.append(knopf);
    }

    if (passende === 0) {
      this.element.append(
        el('div', { class: 'zeile schwach' }, [
          nurFallen
            ? 'Keine Falle im Loadout. Fallen gehoeren auf den Weg.'
            : 'Dieser Platz nimmt nur Fallen auf.',
        ]),
      );
    } else {
      this.element.append(wahl);
    }
    this.aktualisierePreise(world);
  }

  /** Sperrt Turmtasten, fuer die das Gold nicht reicht. */
  private aktualisierePreise(world: World): void {
    for (const knopf of this.element.querySelectorAll<HTMLButtonElement>('.turmwahl button')) {
      const kosten = Number.parseInt(knopf.dataset['kosten'] ?? '0', 10);
      knopf.disabled = world.gold < kosten;
    }
  }

  // --- Eigener Turm --------------------------------------------------------

  zeigeTurm(world: World, tower: Tower, def: TowerDef): void {
    this.offen = true;
    this.bauplatzSchluessel = '';
    this.element.style.display = '';

    // Neu aufbauen nur, wenn sich die Anordnung aendert. Sonst reicht es, die
    // Beschriftungen zu erneuern, und ein Fingertipp geht nicht verloren.
    const bauart = `${tower.defId}|${tower.level}|${tower.faehigkeitA}|${tower.faehigkeitB}`;
    if (
      this.turmAnsicht === null ||
      this.turmAnsicht.towerId !== tower.id ||
      this.turmAnsicht.bauart !== bauart
    ) {
      this.baueTurmAnsicht(world, tower, def, bauart);
    }
    this.aktualisiereTurm(world, tower, def);
  }

  private baueTurmAnsicht(world: World, tower: Tower, def: TowerDef, bauart: string): void {
    leere(this.element);

    const stufe = el('span', { class: 'schwach' });
    const kennwerte = el('div', { class: 'kennwerte' });
    this.element.append(
      el('div', { class: 'kopf' }, [el('span', { class: 'name' }, [def.name]), stufe]),
      kennwerte,
    );

    // Zeile 1: Ausbau. Bleibt als gesperrte Taste stehen, wenn nichts mehr
    // geht, damit nichts nachrutscht.
    const ausbau = taste('Ausbauen', () => this.rueckrufe.beiAusbauen(tower.id), 'klein stark voll');
    this.element.append(el('div', { class: 'reihe' }, [ausbau]));

    // Zeile 2: Spezialfaehigkeiten, erst ab der Hoechststufe sichtbar.
    const faehigkeiten: HTMLButtonElement[] = [];
    const vollAusgebaut = tower.level >= def.upgrades.length;
    if (vollAusgebaut && def.faehigkeiten.length > 0) {
      const reihe = el('div', { class: 'faehigkeiten' });
      def.faehigkeiten.forEach((faehigkeit: FaehigkeitDef, index: number) => {
        const knopf = el('button', { class: 'taste klein faehigkeit', type: 'button' }, [
          el('span', { class: 'fname' }, [faehigkeit.name]),
          el('span', { class: 'frang' }),
          el('span', { class: 'fpreis' }),
        ]);
        knopf.title = faehigkeit.beschreibung;
        knopf.addEventListener('click', (ereignis) => {
          ereignis.stopPropagation();
          this.rueckrufe.beiFaehigkeit(tower.id, index);
        });
        faehigkeiten.push(knopf);
        reihe.append(knopf);
      });
      this.element.append(reihe);
    }

    // Zeile 3: Zielprioritaet.
    const zielTasten = new Map<TargetPolicy, HTMLButtonElement>();
    if (def.fireRate > 0) {
      const ziele = el('div', { class: 'zielreihe' });
      for (const eintrag of ZIELE) {
        const knopf = taste(eintrag.kurz, () => this.rueckrufe.beiZiel(tower.id, eintrag.id), 'klein');
        knopf.title = eintrag.name;
        zielTasten.set(eintrag.id, knopf);
        ziele.append(knopf);
      }
      this.element.append(ziele);
    }

    // Zeile 4: Verkauf. Eigene Zeile, feste Groesse, weit weg vom Ausbau.
    const verkauf = taste('Verkaufen', () => this.rueckrufe.beiVerkaufen(tower.id), 'klein gefahr');
    this.element.append(el('div', { class: 'verkaufzeile' }, [verkauf]));

    this.turmAnsicht = {
      towerId: tower.id,
      bauart,
      kennwerte,
      stufe,
      ausbau,
      verkauf,
      faehigkeiten,
      zielTasten,
    };
    void world;
  }

  /** Erneuert Beschriftungen und Sperren, ohne die Tasten auszutauschen. */
  private aktualisiereTurm(world: World, tower: Tower, def: TowerDef): void {
    const ansicht = this.turmAnsicht;
    if (ansicht === null) return;

    const hoechst = def.upgrades.length;
    ansicht.stufe.textContent =
      tower.level >= hoechst ? `Stufe ${hoechst + 1} · voll` : `Stufe ${tower.level + 1}`;

    leere(ansicht.kennwerte);
    const kennwert = (marke: string, inhalt: string): void => {
      ansicht.kennwerte.append(el('span', {}, [`${marke} `, el('b', {}, [inhalt])]));
    };
    if (tower.damage > 0) kennwert('Schaden', formatiere(tower.damage));
    if (tower.fireRate > 0) kennwert('Rate', `${tower.fireRate.toFixed(1)}/s`);
    kennwert('Weite', tower.range.toFixed(1));
    if (tower.splashRadius > 0) kennwert('Flaeche', tower.splashRadius.toFixed(1));
    if (tower.armorPierce > 0) kennwert('Durchschlag', `${Math.round(tower.armorPierce * 100)}%`);
    if (tower.onHit.slowFactor > 0) {
      kennwert('Frost', `${Math.round(tower.onHit.slowFactor * 100)}%`);
    }
    if (tower.onHit.burnDps > 0) kennwert('Brand', `${formatiere(tower.onHit.burnDps)}/s`);
    if (tower.kettenSpruenge > 0) kennwert('Spruenge', String(tower.kettenSpruenge));
    if (tower.damageDealt > 0) kennwert('Gesamt', formatiere(tower.damageDealt));

    const kosten = ausbauKosten(world, def, tower.level);
    if (kosten === null) {
      ansicht.ausbau.textContent = 'Voll ausgebaut';
      ansicht.ausbau.disabled = true;
      ansicht.ausbau.classList.remove('stark');
    } else {
      ansicht.ausbau.textContent = `Ausbauen · ${kosten} G`;
      ansicht.ausbau.disabled = world.gold < kosten;
      ansicht.ausbau.classList.add('stark');
    }

    ansicht.faehigkeiten.forEach((knopf, index) => {
      const faehigkeit = def.faehigkeiten[index];
      if (faehigkeit === undefined) return;
      const rang = faehigkeitRang(tower, index);
      const preis = faehigkeitKosten(world, def, tower, index);
      const rangFeld = knopf.querySelector('.frang');
      const preisFeld = knopf.querySelector('.fpreis');
      if (rangFeld !== null) rangFeld.textContent = raengePunkte(rang, faehigkeit.raenge.length);
      if (preisFeld !== null) preisFeld.textContent = preis === null ? 'fertig' : `${preis} G`;
      knopf.disabled = preis === null || world.gold < preis;
      knopf.classList.toggle('erlernt', rang > 0);
    });

    for (const [policy, knopf] of ansicht.zielTasten) {
      knopf.classList.toggle('aktiv', tower.policy === policy);
    }

    ansicht.verkauf.textContent = `Verkaufen · ${Math.floor(tower.invested * world.boni.verkaufswert)} G`;
  }

  /** Wird jedes Bild aufgerufen, damit Preise und Sperren aktuell bleiben. */
  aktualisiere(world: World, tower: Tower | null, def: TowerDef | null): void {
    if (!this.offen) return;
    if (this.turmAnsicht !== null && tower !== null && def !== null) {
      this.zeigeTurm(world, tower, def);
      return;
    }
    if (this.bauplatzSchluessel !== '') this.aktualisierePreise(world);
  }
}
