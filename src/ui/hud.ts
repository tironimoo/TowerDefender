/**
 * Anzeige waehrend einer Partie.
 *
 * Oben Gold, Leben und Welle. Unten die Geschwindigkeit und die Taste fuer die
 * naechste Welle. Alles Bedienbare liegt unten, damit es im Querformat mit den
 * Daumen erreichbar ist.
 */

import type { World } from '@sim/index';
import { el, formatiere, taste } from './bausteine';

export interface HudRueckrufe {
  readonly beiWelleStarten: () => void;
  readonly beiTempo: (tempo: number) => void;
  readonly beiMenue: () => void;
}

const TEMPI = [1, 2, 3];

export class Hud {
  readonly element: HTMLElement;
  private readonly goldWert: HTMLElement;
  private readonly lebenWert: HTMLElement;
  private readonly welleWert: HTMLElement;
  private readonly wellentaste: HTMLButtonElement;
  private readonly wellenOben: HTMLElement;
  private readonly wellenUnten: HTMLElement;
  private readonly tempoTasten: HTMLButtonElement[] = [];
  private readonly meldung: HTMLElement;
  private meldungBis = 0;

  constructor(private readonly rueckrufe: HudRueckrufe) {
    this.goldWert = el('span', { class: 'zahl gold' }, ['0']);
    this.lebenWert = el('span', { class: 'zahl leben' }, ['0']);
    this.welleWert = el('span', { class: 'zahl' }, ['0']);

    const leiste = el('div', { class: 'leiste' }, [
      el('div', { class: 'werte' }, [
        el('div', { class: 'wert' }, [el('span', { class: 'marke' }, ['Gold']), this.goldWert]),
        el('div', { class: 'wert' }, [el('span', { class: 'marke' }, ['Leben']), this.lebenWert]),
        el('div', { class: 'wert' }, [el('span', { class: 'marke' }, ['Welle']), this.welleWert]),
      ]),
      el('div', { class: 'luecke' }),
      taste('Menue', () => this.rueckrufe.beiMenue(), 'klein'),
    ]);

    this.wellenOben = el('span', {}, ['Welle starten']);
    this.wellenUnten = el('span', { class: 'unten' }, ['']);
    this.wellentaste = el('button', { class: 'taste wellentaste stark', type: 'button' }, [
      this.wellenOben,
      this.wellenUnten,
    ]);
    this.wellentaste.addEventListener('click', (ereignis) => {
      ereignis.stopPropagation();
      this.rueckrufe.beiWelleStarten();
    });

    const tempo = el('div', { class: 'tempo' });
    for (const stufe of TEMPI) {
      const knopf = el('button', { class: 'taste klein', type: 'button' }, [`${stufe}x`]);
      knopf.addEventListener('click', (ereignis) => {
        ereignis.stopPropagation();
        this.rueckrufe.beiTempo(stufe);
      });
      this.tempoTasten.push(knopf);
      tempo.append(knopf);
    }

    const fuss = el('div', { class: 'fussleiste' }, [
      tempo,
      el('div', { class: 'luecke' }),
      this.wellentaste,
    ]);

    this.meldung = el('div', { class: 'meldung' });

    this.element = el('div', { id: 'ui' }, [leiste, this.meldung, fuss]);
  }

  setzeTempo(tempo: number): void {
    this.tempoTasten.forEach((knopf, index) => {
      knopf.classList.toggle('aktiv', TEMPI[index] === tempo);
    });
  }

  zeigeMeldung(text: string): void {
    this.meldung.textContent = text;
    this.meldung.classList.add('sichtbar');
    this.meldungBis = performance.now() + 1800;
  }

  aktualisiere(world: World, jetzt: number): void {
    this.goldWert.textContent = formatiere(world.gold);
    this.lebenWert.textContent = String(Math.max(0, world.lives));
    this.welleWert.textContent = `${Math.min(world.wavesStarted + 1, world.waveCount)}/${world.waveCount}`;

    const alleGestartet = world.wavesStarted >= world.waveCount;
    this.wellentaste.disabled = alleGestartet;

    if (alleGestartet) {
      this.wellenOben.textContent = 'Letzte Welle';
      this.wellenUnten.textContent = 'durchhalten';
      this.wellentaste.classList.remove('stark');
    } else if (world.status === 'vorbereitung') {
      this.wellenOben.textContent = 'Welle starten';
      this.wellenUnten.textContent = 'baue in Ruhe auf';
      this.wellentaste.classList.add('stark');
    } else {
      const rest = Math.max(0, Math.ceil(world.waveTimer));
      this.wellenOben.textContent = 'Naechste Welle';
      this.wellenUnten.textContent = rest > 0 ? `in ${rest}s  ·  +${rest} Gold` : 'laeuft';
      this.wellentaste.classList.toggle('stark', rest > 0);
    }

    if (this.meldungBis > 0 && jetzt > this.meldungBis) {
      this.meldung.classList.remove('sichtbar');
      this.meldungBis = 0;
    }
  }
}
