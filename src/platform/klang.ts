/**
 * Ton.
 *
 * Alle Geraeusche werden erzeugt, nicht abgespielt. Das spart Dateien, haelt
 * das Spiel klein und passt zum eckigen Stil. Musik ist eine ruhige Flaeche,
 * die je Region ihre Stimmung wechselt.
 *
 * Der Tonzusammenhang darf erst nach einer Berührung entstehen, sonst
 * blockieren ihn die Browser. Bis dahin passiert hier schlicht nichts.
 */

import type { Region, SimEvent } from '@sim/index';

type Wellenform = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface TonOptionen {
  readonly form: Wellenform;
  readonly von: number;
  readonly nach: number;
  readonly dauer: number;
  readonly laut: number;
  readonly verzoegerung?: number;
}

/** Grundtoene der drei Regionen, als Frequenzen in Hertz. */
const AKKORDE: Readonly<Record<Region, readonly number[]>> = {
  wald: [98, 147, 196, 247],
  glut: [87, 131, 174, 207],
  leere: [82, 123, 165, 196],
};

class Klang {
  private kontext: AudioContext | null = null;
  private effekte: GainNode | null = null;
  private musik: GainNode | null = null;
  private musikQuellen: OscillatorNode[] = [];
  private tonAn = true;
  private musikAn = true;
  private letzterSchuss = 0;
  private letzterTreffer = 0;

  setzeEinstellungen(ton: boolean, musik: boolean): void {
    this.tonAn = ton;
    this.musikAn = musik;
    if (this.musik !== null && this.kontext !== null) {
      this.musik.gain.setTargetAtTime(musik ? 0.05 : 0, this.kontext.currentTime, 0.2);
    }
  }

  /** Muss aus einer Berührung heraus aufgerufen werden. */
  wecke(): void {
    if (this.kontext !== null) {
      void this.kontext.resume();
      return;
    }
    try {
      this.kontext = new AudioContext();
      this.effekte = this.kontext.createGain();
      this.effekte.gain.value = 0.28;
      this.effekte.connect(this.kontext.destination);
      this.musik = this.kontext.createGain();
      this.musik.gain.value = 0;
      this.musik.connect(this.kontext.destination);
    } catch {
      // Kein Ton moeglich. Das Spiel laeuft ohne weiter.
      this.kontext = null;
    }
  }

  private ton(optionen: TonOptionen): void {
    const kontext = this.kontext;
    const ziel = this.effekte;
    if (kontext === null || ziel === null || !this.tonAn) return;

    const start = kontext.currentTime + (optionen.verzoegerung ?? 0);
    const oszillator = kontext.createOscillator();
    const huellkurve = kontext.createGain();
    oszillator.type = optionen.form;
    oszillator.frequency.setValueAtTime(optionen.von, start);
    oszillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, optionen.nach),
      start + optionen.dauer,
    );
    huellkurve.gain.setValueAtTime(0.0001, start);
    huellkurve.gain.exponentialRampToValueAtTime(optionen.laut, start + 0.008);
    huellkurve.gain.exponentialRampToValueAtTime(0.0001, start + optionen.dauer);
    oszillator.connect(huellkurve).connect(ziel);
    oszillator.start(start);
    oszillator.stop(start + optionen.dauer + 0.02);
  }

  private rauschen(dauer: number, laut: number, hochpass: number): void {
    const kontext = this.kontext;
    const ziel = this.effekte;
    if (kontext === null || ziel === null || !this.tonAn) return;

    const laenge = Math.floor(kontext.sampleRate * dauer);
    const puffer = kontext.createBuffer(1, Math.max(1, laenge), kontext.sampleRate);
    const daten = puffer.getChannelData(0);
    for (let i = 0; i < daten.length; i++) {
      daten[i] = (Math.random() * 2 - 1) * (1 - i / daten.length);
    }
    const quelle = kontext.createBufferSource();
    quelle.buffer = puffer;
    const filter = kontext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hochpass;
    const huellkurve = kontext.createGain();
    huellkurve.gain.value = laut;
    quelle.connect(filter).connect(huellkurve).connect(ziel);
    quelle.start();
  }

  // --- Einzelne Geraeusche -------------------------------------------------

  tippen(): void {
    this.ton({ form: 'square', von: 620, nach: 680, dauer: 0.05, laut: 0.12 });
  }

  bauen(): void {
    this.ton({ form: 'square', von: 180, nach: 320, dauer: 0.14, laut: 0.2 });
    this.rauschen(0.12, 0.1, 900);
  }

  ausbauen(): void {
    this.ton({ form: 'square', von: 320, nach: 640, dauer: 0.16, laut: 0.2 });
    this.ton({ form: 'triangle', von: 480, nach: 960, dauer: 0.2, laut: 0.12, verzoegerung: 0.05 });
  }

  verkaufen(): void {
    this.ton({ form: 'triangle', von: 520, nach: 200, dauer: 0.16, laut: 0.16 });
  }

  private schuss(): void {
    const jetzt = performance.now();
    // Bei dreissig Schuessen je Sekunde wuerde jeder Einzelton zu Matsch.
    if (jetzt - this.letzterSchuss < 60) return;
    this.letzterSchuss = jetzt;
    this.rauschen(0.05, 0.05, 2200);
  }

  private treffer(): void {
    const jetzt = performance.now();
    if (jetzt - this.letzterTreffer < 45) return;
    this.letzterTreffer = jetzt;
    this.ton({ form: 'square', von: 240, nach: 120, dauer: 0.05, laut: 0.08 });
  }

  tod(): void {
    this.rauschen(0.14, 0.09, 700);
  }

  welleStart(): void {
    this.ton({ form: 'sawtooth', von: 160, nach: 240, dauer: 0.3, laut: 0.16 });
    this.ton({ form: 'sawtooth', von: 240, nach: 320, dauer: 0.3, laut: 0.12, verzoegerung: 0.12 });
  }

  durchbruch(): void {
    this.ton({ form: 'sawtooth', von: 220, nach: 90, dauer: 0.35, laut: 0.22 });
  }

  bossphase(): void {
    this.ton({ form: 'sawtooth', von: 90, nach: 180, dauer: 0.6, laut: 0.24 });
    this.rauschen(0.5, 0.12, 300);
  }

  gewonnen(): void {
    [392, 494, 587, 784].forEach((frequenz, index) => {
      this.ton({
        form: 'triangle',
        von: frequenz,
        nach: frequenz,
        dauer: 0.35,
        laut: 0.2,
        verzoegerung: index * 0.12,
      });
    });
  }

  verloren(): void {
    [330, 262, 196, 147].forEach((frequenz, index) => {
      this.ton({
        form: 'triangle',
        von: frequenz,
        nach: frequenz * 0.98,
        dauer: 0.45,
        laut: 0.2,
        verzoegerung: index * 0.16,
      });
    });
  }

  /** Wandelt die Ereignisse eines Schrittes in Geraeusche um. */
  ausEreignissen(ereignisse: readonly SimEvent[]): void {
    for (const ereignis of ereignisse) {
      switch (ereignis.type) {
        case 'schuss':
          this.schuss();
          break;
        case 'treffer':
          if (!ereignis.abgeprallt) this.treffer();
          break;
        case 'gegner-gestorben':
          this.tod();
          break;
        case 'gegner-durch':
          this.durchbruch();
          break;
        case 'welle-gestartet':
          this.welleStart();
          break;
        case 'bossphase':
          this.bossphase();
          break;
        case 'gewonnen':
          this.gewonnen();
          break;
        case 'verloren':
          this.verloren();
          break;
        default:
          break;
      }
    }
  }

  // --- Musik ---------------------------------------------------------------

  starteMusik(region: Region): void {
    this.stoppeMusik();
    const kontext = this.kontext;
    const ziel = this.musik;
    if (kontext === null || ziel === null) return;

    const toene = AKKORDE[region];
    for (const frequenz of toene) {
      const oszillator = kontext.createOscillator();
      oszillator.type = 'triangle';
      oszillator.frequency.value = frequenz;
      const leise = kontext.createGain();
      leise.gain.value = 0.25;
      // Langsames Schweben, damit die Flaeche nicht steht.
      const schwebung = kontext.createOscillator();
      schwebung.type = 'sine';
      schwebung.frequency.value = 0.05 + frequenz / 8000;
      const tiefe = kontext.createGain();
      tiefe.gain.value = 0.9;
      schwebung.connect(tiefe).connect(oszillator.frequency);

      oszillator.connect(leise).connect(ziel);
      oszillator.start();
      schwebung.start();
      this.musikQuellen.push(oszillator, schwebung);
    }
    ziel.gain.setTargetAtTime(this.musikAn ? 0.05 : 0, kontext.currentTime, 1.5);
  }

  stoppeMusik(): void {
    for (const quelle of this.musikQuellen) {
      try {
        quelle.stop();
      } catch {
        // Bereits gestoppt.
      }
    }
    this.musikQuellen = [];
    if (this.musik !== null && this.kontext !== null) {
      this.musik.gain.setValueAtTime(0, this.kontext.currentTime);
    }
  }
}

export const klang = new Klang();
