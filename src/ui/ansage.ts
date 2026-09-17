/**
 * Ansagen und Warnungen waehrend einer Partie.
 *
 * Eine Welle, die ohne Ankuendigung beginnt, ueberrascht nicht, sie
 * ueberrumpelt. Eine Lebensanzeige, die auf drei faellt, muss man sehen, ohne
 * hinzuschauen. Beides erledigt diese Schicht.
 */

import type { World } from '@sim/index';
import { el } from './bausteine';

export class Ansage {
  readonly element: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bossleiste: HTMLElement;
  private readonly bossName: HTMLElement;
  private readonly bossBalken: HTMLElement;
  private readonly warnung: HTMLElement;
  private bannerBis = 0;

  constructor() {
    this.banner = el('div', { class: 'banner' });
    this.bossName = el('span', { class: 'bossname' });
    this.bossBalken = el('span');
    this.bossleiste = el('div', { class: 'bossleiste' }, [
      this.bossName,
      el('div', { class: 'bossbalken' }, [this.bossBalken]),
    ]);
    this.bossleiste.style.display = 'none';
    this.warnung = el('div', { class: 'warnung' });

    this.element = el('div', { class: 'ansagen' }, [this.warnung, this.banner, this.bossleiste]);
  }

  zeige(text: string, unterzeile = '', dauer = 1600): void {
    const teile: HTMLElement[] = [el('span', { class: 'gross' }, [text])];
    if (unterzeile !== '') teile.push(el('span', { class: 'klein' }, [unterzeile]));
    this.banner.replaceChildren(...teile);
    this.banner.classList.remove('sichtbar');
    // Neustart der Einblendung erzwingen.
    void this.banner.offsetWidth;
    this.banner.classList.add('sichtbar');
    this.bannerBis = performance.now() + dauer;
  }

  aktualisiere(world: World, jetzt: number): void {
    if (this.bannerBis > 0 && jetzt > this.bannerBis) {
      this.banner.classList.remove('sichtbar');
      this.bannerBis = 0;
    }

    // Bossleiste, sobald ein Boss auf der Karte ist.
    let boss = null;
    for (const gegner of world.enemies.items) {
      if (!gegner.active) continue;
      const def = world.content.enemies.get(gegner.defId);
      if (def?.boss === undefined || def.boss === null) continue;
      if (boss === null || gegner.health > boss.health) boss = gegner;
    }

    if (boss === null) {
      this.bossleiste.style.display = 'none';
    } else {
      const def = world.content.enemies.get(boss.defId);
      this.bossleiste.style.display = '';
      this.bossName.textContent = `${def?.name ?? 'Boss'} · Phase ${boss.bossPhase + 1}`;
      const anteil = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
      this.bossBalken.style.width = `${anteil * 100}%`;
    }

    // Warnung, wenn es eng wird.
    const knapp = world.lives > 0 && world.lives <= Math.max(3, world.startLives * 0.2);
    this.warnung.classList.toggle('sichtbar', knapp);
  }
}
