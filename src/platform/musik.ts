/**
 * Musik.
 *
 * Drei ruhige Stuecke, vollstaendig im Browser erzeugt. Es gibt keine
 * Musikdateien: das haelt die App klein, und der Ton laesst sich frei an die
 * Region anpassen.
 *
 * Wichtig ist, dass es *Musik* ist und kein Dauerton. Jedes Stueck hat deshalb
 * ein Tempo, eine Akkordfolge und eine Melodie. Die Melodie wird Takt fuer Takt
 * neu gewuerfelt, aber nur aus Toenen, die zum gerade klingenden Akkord passen,
 * und immer in der Naehe des vorigen Tones. So entsteht eine Linie statt einer
 * Folge zufaelliger Toene, und das Stueck wiederholt sich nie woertlich.
 *
 * Geplant wird im Voraus: alle 200 Millisekunden schauen wir, welche Takte in
 * den naechsten anderthalb Sekunden beginnen, und melden deren Toene beim
 * Tonzusammenhang an. Der spielt sie dann exakt zur richtigen Zeit ab, auch
 * wenn der Bildaufbau gerade stockt.
 */

import type { Region } from '@sim/index';

/** Wie weit im Voraus Toene angemeldet werden, in Sekunden. */
const VORLAUF = 1.6;
/** Wie oft nachgeschaut wird, in Millisekunden. */
const TAKTGEBER = 200;
const SCHLAEGE_JE_TAKT = 4;
/**
 * Umfang der Melodie in Halbtoenen, gerechnet ab der Melodielage.
 * Eine Oktave plus Quinte: weit genug fuer eine Linie, eng genug, dass die
 * Melodie nicht in schrille Hoehen rutscht.
 */
const MELODIE_UMFANG = 19;

export interface StueckDef {
  readonly id: string;
  readonly name: string;
  readonly bpm: number;
  /** MIDI-Note des Basstons. */
  readonly grundton: number;
  /** Tonleiter in Halbtoenen ueber dem Grundton. */
  readonly leiter: readonly number[];
  /** Akkordfolge, je Takt ein Akkord, in Halbtoenen ueber dem Grundton. */
  readonly akkorde: readonly (readonly number[])[];
  /**
   * Wie weit die Melodie ueber dem Bass liegt, in Halbtoenen.
   * Muss ein Vielfaches von zwoelf sein, sonst verrutscht die Tonart.
   */
  readonly melodieLage: number;
  /** Filterfrequenz der Melodie in Hertz. Kleiner klingt dumpfer. */
  readonly hell: number;
  /** Wahrscheinlichkeit, dass an einer Achtelstelle ein Ton steht. */
  readonly dichte: number;
  /** Region, zu der das Stueck am besten passt. */
  readonly heimat: Region;
}

/**
 * Die drei Stuecke.
 *
 * Alle drei sind bewusst langsam und luftig: Musik, die stundenlang neben dem
 * Spiel laufen soll, darf nicht draengen.
 */
export const STUECKE: readonly StueckDef[] = [
  {
    id: 'lichtung',
    name: 'Lichtung',
    bpm: 64,
    grundton: 50, // D3
    leiter: [0, 2, 4, 5, 7, 9, 11],
    akkorde: [
      [0, 4, 7, 14], // D add9
      [-3, 0, 4, 7], // Bm7
      [-7, -3, 0, 4], // Gmaj7
      [-5, -1, 2, 7], // A add9
    ],
    melodieLage: 12,
    hell: 2600,
    dichte: 0.4,
    heimat: 'wald',
  },
  {
    id: 'glutschacht',
    name: 'Glutschacht',
    bpm: 54,
    grundton: 45, // A2
    leiter: [0, 2, 3, 5, 7, 8, 10],
    akkorde: [
      [0, 3, 7, 12], // Am
      [-4, 0, 3, 7], // Fmaj7
      [3, 7, 10, 15], // C
      [-2, 3, 7, 10], // G
    ],
    melodieLage: 12,
    hell: 1700,
    dichte: 0.32,
    heimat: 'glut',
  },
  {
    id: 'fernes-echo',
    name: 'Fernes Echo',
    bpm: 48,
    grundton: 47, // B2
    leiter: [0, 2, 4, 5, 7, 9, 11],
    akkorde: [
      [0, 7, 11, 14], // B add9, weit gesetzt
      [-3, 2, 4, 9], // G#sus
      [-7, -3, 0, 4], // Emaj7
      [-5, -1, 2, 7], // F#
    ],
    melodieLage: 12,
    hell: 3400,
    dichte: 0.26,
    heimat: 'leere',
  },
];

/** Kleiner Zufallsgeber mit Startwert, damit sich ein Stueck reproduzieren laesst. */
function wuerfelwerk(saat: number): () => number {
  let zustand = saat >>> 0;
  return () => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frequenz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Der Musikspieler.
 *
 * Haengt an einem eigenen Regler, damit sich Musik und Geraeusche getrennt
 * stummschalten lassen.
 */
export class Musik {
  private readonly kontext: AudioContext;
  private readonly regler: GainNode;
  private readonly hall: GainNode;
  private uhr: ReturnType<typeof setInterval> | null = null;
  private stueck: StueckDef | null = null;
  private wuerfel: () => number = wuerfelwerk(1);
  private takt = 0;
  private naechsterTakt = 0;
  private letzterTon = 0;
  private laufende: { quelle: AudioScheduledSourceNode; ende: number }[] = [];
  private an = true;
  private zuletztGespielt = '';

  constructor(kontext: AudioContext, ziel: AudioNode) {
    this.kontext = kontext;
    this.regler = kontext.createGain();
    this.regler.gain.value = 0;
    this.regler.connect(ziel);

    // Eine kurze Echofahne gibt den wenigen Toenen Raum. Ohne sie klingt jeder
    // Anschlag nackt und die Stille dazwischen leer.
    this.hall = kontext.createGain();
    this.hall.gain.value = 0.32;
    const verzoegerung = kontext.createDelay(1);
    verzoegerung.delayTime.value = 0.37;
    const rueckfuehrung = kontext.createGain();
    rueckfuehrung.gain.value = 0.34;
    const daempfung = kontext.createBiquadFilter();
    daempfung.type = 'lowpass';
    daempfung.frequency.value = 2200;
    this.hall.connect(verzoegerung);
    verzoegerung.connect(daempfung).connect(rueckfuehrung).connect(verzoegerung);
    verzoegerung.connect(this.regler);
    daempfung.connect(this.regler);
  }

  /** Waehlt ein Stueck zur Region und startet es. Nie zweimal dasselbe nacheinander. */
  starte(region: Region): void {
    const eigene = STUECKE.filter((s) => s.heimat === region);
    const andere = STUECKE.filter((s) => s.id !== this.zuletztGespielt);
    // Das Stueck der Region zaehlt doppelt, die anderen einfach. So passt die
    // Musik meist zur Gegend, wird aber trotzdem nicht langweilig.
    const topf = [...andere, ...eigene.filter((s) => s.id !== this.zuletztGespielt)];
    const auswahl = topf.length > 0 ? topf : STUECKE;
    const gewaehlt = auswahl[Math.floor(Math.random() * auswahl.length)];
    if (gewaehlt === undefined) return;
    this.spiele(gewaehlt);
  }

  /** Startet ein bestimmtes Stueck. */
  spiele(stueck: StueckDef): void {
    this.halt();
    this.stueck = stueck;
    this.zuletztGespielt = stueck.id;
    this.wuerfel = wuerfelwerk(Math.floor(Math.random() * 0xffffff) + 1);
    this.takt = 0;
    this.letzterTon = stueck.grundton + stueck.melodieLage;
    this.naechsterTakt = this.kontext.currentTime + 0.35;
    this.regler.gain.cancelScheduledValues(this.kontext.currentTime);
    this.regler.gain.setValueAtTime(0.0001, this.kontext.currentTime);
    if (this.an) {
      this.regler.gain.exponentialRampToValueAtTime(0.085, this.kontext.currentTime + 2.5);
    }
    this.plane();
    this.uhr = setInterval(() => {
      this.plane();
    }, TAKTGEBER);
  }

  /** Welches Stueck gerade laeuft. Null, solange keines gestartet wurde. */
  laufendesStueck(): StueckDef | null {
    return this.stueck;
  }

  /** Schaltet die Musik an oder aus. Beim Anschalten laeuft das Stueck weiter. */
  setzeAn(an: boolean): void {
    this.an = an;
    const jetzt = this.kontext.currentTime;
    this.regler.gain.cancelScheduledValues(jetzt);
    this.regler.gain.setValueAtTime(Math.max(0.0001, this.regler.gain.value), jetzt);
    this.regler.gain.exponentialRampToValueAtTime(an ? 0.085 : 0.0001, jetzt + 0.8);
    if (an && this.uhr === null && this.stueck !== null) this.spiele(this.stueck);
    if (!an) this.halt();
  }

  /** Blendet aus und haelt an. */
  stoppe(): void {
    const jetzt = this.kontext.currentTime;
    this.regler.gain.cancelScheduledValues(jetzt);
    this.regler.gain.setValueAtTime(Math.max(0.0001, this.regler.gain.value), jetzt);
    this.regler.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.6);
    this.halt();
  }

  private halt(): void {
    if (this.uhr !== null) {
      clearInterval(this.uhr);
      this.uhr = null;
    }
    // Nur was noch klingt, wird ausgeblendet. Ein bereits abgelaufener Ton darf
    // kein neues, spaeteres Ende bekommen.
    const schluss = this.kontext.currentTime + 0.7;
    for (const eintrag of this.laufende) {
      if (eintrag.ende <= schluss) continue;
      try {
        eintrag.quelle.stop(schluss);
      } catch {
        // Schon gestoppt.
      }
    }
    this.laufende = [];
  }

  /** Meldet alle Takte an, die im Vorlauffenster beginnen. */
  private plane(): void {
    const stueck = this.stueck;
    if (stueck === null) return;
    const taktDauer = (SCHLAEGE_JE_TAKT * 60) / stueck.bpm;
    const grenze = this.kontext.currentTime + VORLAUF;
    let schutz = 0;
    while (this.naechsterTakt < grenze && schutz < 16) {
      this.planeTakt(stueck, this.takt, this.naechsterTakt);
      this.naechsterTakt += taktDauer;
      this.takt++;
      schutz++;
    }
    // Abgeklungene Quellen vergessen, sonst waechst die Liste endlos.
    const jetzt = this.kontext.currentTime;
    if (this.laufende.length > 128) {
      this.laufende = this.laufende.filter((eintrag) => eintrag.ende > jetzt);
    }
  }

  private planeTakt(stueck: StueckDef, takt: number, zeit: number): void {
    const schlag = 60 / stueck.bpm;
    const taktDauer = SCHLAEGE_JE_TAKT * schlag;
    const akkord = stueck.akkorde[takt % stueck.akkorde.length] ?? [0];
    const grund = akkord[0] ?? 0;

    // Bass auf der Eins, auf der Drei nur jeden zweiten Takt. Das gibt Puls,
    // ohne zu marschieren.
    this.anschlag(zeit, frequenz(stueck.grundton + grund), taktDauer * 0.9, 0.3, 900, 0.1);
    if (takt % 2 === 1) {
      this.anschlag(
        zeit + 2 * schlag,
        frequenz(stueck.grundton + grund + 12),
        taktDauer * 0.4,
        0.14,
        1100,
        0.1,
      );
    }

    // Flaeche aus den Akkordtoenen, weich einschwebend.
    for (const ton of akkord) {
      this.flaeche(zeit, frequenz(stueck.grundton + 12 + ton), taktDauer + 1.2, 0.05);
    }

    // Melodie auf einem Achtelraster.
    const akkordToene = this.lage(stueck, akkord, stueck.melodieLage);
    const leiterToene = this.lage(stueck, stueck.leiter, stueck.melodieLage);
    for (let i = 0; i < SCHLAEGE_JE_TAKT * 2; i++) {
      // Die Eins des Taktes bekommt oefter einen Ton, damit die Phrase sitzt.
      const chance = i === 0 ? stueck.dichte + 0.3 : stueck.dichte;
      if (this.wuerfel() >= chance) continue;
      const topf = this.wuerfel() < 0.75 ? akkordToene : leiterToene;
      // In der Naehe des vorigen Tones, aber nicht derselbe: sonst klopft die
      // Melodie auf einem einzigen Ton herum.
      const nah = topf.filter((t) => t !== this.letzterTon && Math.abs(t - this.letzterTon) <= 7);
      const quelle = nah.length > 0 ? nah : topf;
      const ton = quelle[Math.floor(this.wuerfel() * quelle.length)];
      if (ton === undefined) continue;
      this.letzterTon = ton;
      const laenge = this.wuerfel() < 0.3 ? schlag * 3 : schlag * 1.6;
      this.anschlag(
        zeit + i * schlag * 0.5,
        frequenz(ton),
        laenge,
        0.16 + this.wuerfel() * 0.06,
        stueck.hell,
        0.6,
      );
    }
  }

  /** Spreizt eine Tonmenge ueber den Melodieumfang in die gewuenschte Lage. */
  private lage(stueck: StueckDef, toene: readonly number[], versatz: number): number[] {
    const unten = stueck.grundton + versatz;
    const heraus: number[] = [];
    for (let oktave = -1; oktave < 3; oktave++) {
      for (const ton of toene) {
        const note = unten + ton + oktave * 12;
        if (note >= unten && note <= unten + MELODIE_UMFANG) heraus.push(note);
      }
    }
    return [...new Set(heraus)].sort((a, b) => a - b);
  }

  /**
   * Ein angeschlagener Ton.
   *
   * Dreieck plus leise Oktave darueber, durch einen Tiefpass: das klingt nach
   * einem weichen Glockenspiel und traegt lange genug, um zu singen.
   */
  private anschlag(
    zeit: number,
    hertz: number,
    dauer: number,
    laut: number,
    hell: number,
    hallanteil: number,
  ): void {
    if (zeit < this.kontext.currentTime) return;
    const huelle = this.kontext.createGain();
    huelle.gain.setValueAtTime(0.0001, zeit);
    huelle.gain.exponentialRampToValueAtTime(laut, zeit + 0.015);
    huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);

    const filter = this.kontext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(hell, zeit);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, hell * 0.35), zeit + dauer);
    filter.Q.value = 0.7;

    for (const [form, versatz, anteil] of [
      ['triangle', 0, 1],
      ['sine', 12, 0.3],
    ] as const) {
      const oszillator = this.kontext.createOscillator();
      oszillator.type = form;
      oszillator.frequency.value = hertz * Math.pow(2, versatz / 12);
      const mischung = this.kontext.createGain();
      mischung.gain.value = anteil;
      oszillator.connect(mischung).connect(filter);
      oszillator.start(zeit);
      oszillator.stop(zeit + dauer + 0.1);
      this.laufende.push({ quelle: oszillator, ende: zeit + dauer + 0.1 });
    }

    filter.connect(huelle);
    huelle.connect(this.regler);
    if (hallanteil > 0) {
      const weg = this.kontext.createGain();
      weg.gain.value = hallanteil;
      huelle.connect(weg).connect(this.hall);
    }
  }

  /** Ein langer, sehr leiser Flaechenton. Traegt den Akkord unter der Melodie. */
  private flaeche(zeit: number, hertz: number, dauer: number, laut: number): void {
    if (zeit < this.kontext.currentTime) return;
    const huelle = this.kontext.createGain();
    huelle.gain.setValueAtTime(0.0001, zeit);
    huelle.gain.exponentialRampToValueAtTime(laut, zeit + dauer * 0.35);
    huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);

    const filter = this.kontext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    for (const verstimmung of [-5, 5]) {
      const oszillator = this.kontext.createOscillator();
      oszillator.type = 'sawtooth';
      oszillator.frequency.value = hertz;
      oszillator.detune.value = verstimmung;
      oszillator.connect(filter);
      oszillator.start(zeit);
      oszillator.stop(zeit + dauer + 0.1);
      this.laufende.push({ quelle: oszillator, ende: zeit + dauer + 0.1 });
    }

    filter.connect(huelle).connect(this.regler);
  }
}
