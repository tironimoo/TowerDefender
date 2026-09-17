/**
 * Bau- und Turmmenue.
 *
 * Erscheint ueber dem angetippten Bauplatz oder Turm. Zeigt beim Bauen die
 * Tuerme des Loadouts mit Preis, beim eigenen Turm Ausbau, Verkauf und
 * Zielpriorität.
 */

import type { TargetPolicy, TowerDef, Tower, World } from '@sim/index';
import { ausbauKosten } from '@sim/index';
import { el, formatiere, leere, taste } from './bausteine';

export interface SchweberRueckrufe {
  readonly beiBauen: (slotIndex: number, towerDefId: string) => void;
  readonly beiAusbauen: (towerId: number) => void;
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

export class Schweber {
  readonly element: HTMLElement;
  private offen = false;

  constructor(private readonly rueckrufe: SchweberRueckrufe) {
    this.element = el('div', { class: 'tafel schweber' });
    this.element.style.display = 'none';
  }

  verbirg(): void {
    this.offen = false;
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

  zeigeBauplatz(world: World, slotIndex: number, loadout: readonly string[]): void {
    leere(this.element);
    this.offen = true;
    this.element.style.display = '';

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

      const bezahlbar = world.gold >= def.cost;
      const knopf = el('button', { type: 'button', disabled: !bezahlbar }, [
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
  }

  zeigeTurm(world: World, tower: Tower, def: TowerDef): void {
    leere(this.element);
    this.offen = true;
    this.element.style.display = '';

    this.element.append(
      el('div', { class: 'kopf' }, [
        el('span', { class: 'name' }, [def.name]),
        el('span', { class: 'schwach' }, [`Stufe ${tower.level + 1}`]),
      ]),
    );

    const kennwerte = el('div', { class: 'kennwerte' });
    const kennwert = (marke: string, inhalt: string): void => {
      kennwerte.append(el('span', {}, [`${marke} `, el('b', {}, [inhalt])]));
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
    if (tower.damageDealt > 0) kennwert('Gesamt', formatiere(tower.damageDealt));
    this.element.append(kennwerte);

    const kosten = ausbauKosten(world, def, tower.level);
    const reihe = el('div', { class: 'reihe' });
    if (kosten === null) {
      reihe.append(el('span', { class: 'schwach' }, ['Voll ausgebaut']));
    } else {
      const knopf = taste(
        `Ausbauen ${kosten} G`,
        () => this.rueckrufe.beiAusbauen(tower.id),
        'klein stark',
      );
      knopf.disabled = world.gold < kosten;
      reihe.append(knopf);
    }
    reihe.append(
      taste(
        `Verkauf ${Math.floor(tower.invested * world.boni.verkaufswert)} G`,
        () => this.rueckrufe.beiVerkaufen(tower.id),
        'klein gefahr',
      ),
    );
    this.element.append(reihe);

    if (def.fireRate > 0) {
      const ziele = el('div', { class: 'zielreihe' });
      for (const eintrag of ZIELE) {
        const knopf = taste(
          eintrag.kurz,
          () => this.rueckrufe.beiZiel(tower.id, eintrag.id),
          `klein ${tower.policy === eintrag.id ? 'aktiv' : ''}`.trim(),
        );
        knopf.title = eintrag.name;
        ziele.append(knopf);
      }
      this.element.append(ziele);
    }
  }
}
