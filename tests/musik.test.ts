/**
 * Tests der Musik.
 *
 * Musik laesst sich nicht automatisch auf Schoenheit pruefen. Was sich pruefen
 * laesst, ist das Handwerk dahinter: dass ueberhaupt Toene geplant werden, dass
 * sie im Takt liegen, dass sie zum Akkord passen und dass es eine Melodie mit
 * Bewegung gibt statt eines Dauertons. Genau das war der Fehler der ersten
 * Fassung, also steht er hier als Test.
 *
 * Dazu wird ein Tonzusammenhang nachgebaut, der alle Anmeldungen mitschreibt.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Musik, STUECKE } from '../src/platform/musik';

interface Anmeldung {
  readonly form: string;
  readonly hertz: number;
  readonly start: number;
  stopp: number;
}

/** Sammelt alles, was der Musikspieler anmeldet. */
class Protokoll {
  readonly toene: Anmeldung[] = [];
  zeit = 0;
}

function kontextAttrappe(protokoll: Protokoll): AudioContext {
  const param = (wert = 0): AudioParam =>
    ({
      value: wert,
      setValueAtTime: () => param(),
      exponentialRampToValueAtTime: () => param(),
      linearRampToValueAtTime: () => param(),
      setTargetAtTime: () => param(),
      cancelScheduledValues: () => param(),
    }) as unknown as AudioParam;

  const knoten = (): AudioNode =>
    ({
      connect: (ziel: AudioNode) => ziel,
      disconnect: () => undefined,
    }) as unknown as AudioNode;

  const kontext = {
    get currentTime() {
      return protokoll.zeit;
    },
    destination: knoten(),
    createGain: () => ({ ...knoten(), gain: param(1) }),
    createDelay: () => ({ ...knoten(), delayTime: param(0) }),
    createBiquadFilter: () => ({
      ...knoten(),
      type: 'lowpass',
      frequency: param(1000),
      Q: param(1),
    }),
    createOscillator: () => {
      const eintrag: Anmeldung = { form: 'sine', hertz: 0, start: 0, stopp: 0 };
      return {
        ...knoten(),
        set type(wert: string) {
          (eintrag as { form: string }).form = wert;
        },
        frequency: {
          ...param(0),
          set value(wert: number) {
            (eintrag as { hertz: number }).hertz = wert;
          },
          get value() {
            return eintrag.hertz;
          },
        },
        detune: param(0),
        start: (zeit: number) => {
          (eintrag as { start: number }).start = zeit;
          protokoll.toene.push(eintrag);
        },
        stop: (zeit: number) => {
          eintrag.stopp = zeit;
        },
      };
    },
  };
  return kontext as unknown as AudioContext;
}

/** Spielt ein Stueck so lange, dass mehrere Takte geplant werden. */
function spiele(stueck: (typeof STUECKE)[number], sekunden: number): Protokoll {
  const protokoll = new Protokoll();
  const kontext = kontextAttrappe(protokoll);
  const musik = new Musik(kontext, kontext.destination);
  musik.spiele(stueck);
  for (let i = 0; i < sekunden * 5; i++) {
    protokoll.zeit += 0.2;
    vi.advanceTimersByTime(200);
  }
  musik.stoppe();
  return protokoll;
}

/** MIDI-Note aus einer Frequenz. Rundet, weil die Frequenz aus Potenzen kommt. */
function midi(hertz: number): number {
  return Math.round(69 + 12 * Math.log2(hertz / 440));
}

beforeEach(() => {
  vi.useFakeTimers();
  return () => {
    vi.useRealTimers();
  };
});

describe('Musik', () => {
  it('es gibt drei Stuecke, je eines je Region', () => {
    expect(STUECKE.length).toBe(3);
    expect(new Set(STUECKE.map((s) => s.heimat)).size).toBe(3);
    expect(new Set(STUECKE.map((s) => s.id)).size).toBe(3);
  });

  it('jedes Stueck hat eine Akkordfolge und eine Tonleiter', () => {
    for (const stueck of STUECKE) {
      expect(stueck.akkorde.length, stueck.id).toBeGreaterThanOrEqual(2);
      expect(stueck.leiter.length, stueck.id).toBeGreaterThanOrEqual(5);
      expect(stueck.bpm, stueck.id).toBeGreaterThan(30);
      expect(stueck.bpm, stueck.id).toBeLessThan(120);
    }
  });

  it('meldet fortlaufend Toene an, nicht einen Dauerton', () => {
    for (const stueck of STUECKE) {
      const protokoll = spiele(stueck, 20);
      expect(protokoll.toene.length, stueck.id).toBeGreaterThan(40);
      // Kein Ton darf laenger klingen als ein paar Takte. Sonst steht er.
      const laengster = Math.max(...protokoll.toene.map((t) => t.stopp - t.start));
      expect(laengster, stueck.id).toBeLessThan(12);
    }
  });

  it('die Toene verteilen sich ueber die Zeit', () => {
    const stueck = STUECKE[0];
    if (stueck === undefined) throw new Error('Stueck fehlt.');
    const protokoll = spiele(stueck, 20);
    const starts = protokoll.toene.map((t) => t.start);
    expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThan(10);
    // Die Anschlaege liegen auf einem Achtelraster.
    const achtel = 30 / stueck.bpm;
    for (const start of starts) {
      const rest = Math.abs(((start - Math.min(...starts)) / achtel) % 1);
      expect(Math.min(rest, 1 - rest)).toBeLessThan(0.02);
    }
  });

  it('die Melodie bewegt sich und bleibt in der Tonart', () => {
    for (const stueck of STUECKE) {
      const protokoll = spiele(stueck, 30);
      const noten = protokoll.toene
        .map((t) => midi(t.hertz))
        .filter((n) => n >= stueck.grundton + stueck.melodieLage - 1);
      expect(noten.length, stueck.id).toBeGreaterThan(8);
      // Mehr als eine Tonhoehe: sonst waere es wieder ein Dauerton.
      expect(new Set(noten).size, stueck.id).toBeGreaterThan(3);
      // Alles liegt in der Tonleiter des Stueckes.
      const erlaubt = new Set(stueck.leiter.map((t) => (t + 120) % 12));
      const fremde = noten.filter((n) => !erlaubt.has((n - stueck.grundton + 120) % 12));
      expect(fremde.length, `${stueck.id}: ${fremde.join()}`).toBe(0);
    }
  });

  it('spielt nicht zweimal dasselbe Stueck hintereinander', () => {
    const protokoll = new Protokoll();
    const kontext = kontextAttrappe(protokoll);
    const musik = new Musik(kontext, kontext.destination);
    const gehoert: string[] = [];
    for (let i = 0; i < 20; i++) {
      musik.starte('wald');
      const jetzt = musik.laufendesStueck();
      expect(jetzt).not.toBeNull();
      if (jetzt !== null) {
        expect(jetzt.id).not.toBe(gehoert[gehoert.length - 1]);
        gehoert.push(jetzt.id);
      }
      musik.stoppe();
    }
    // Ueber zwanzig Level sollte man alle drei Stuecke gehoert haben.
    expect(new Set(gehoert).size).toBe(3);
  });
});
