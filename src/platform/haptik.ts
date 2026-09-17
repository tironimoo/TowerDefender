/**
 * Vibration.
 *
 * Kurze Rueckmeldung an den Fingern. Nur dort, wo sie etwas bedeutet: beim
 * Gewinnen, beim Verlieren und bei einem Durchbruch. Dauerndes Vibrieren
 * nervt und leert den Akku.
 */

export type Anlass = 'erfolg' | 'fehlschlag' | 'durchbruch';

const MUSTER: Readonly<Record<Anlass, readonly number[]>> = {
  erfolg: [18, 60, 18, 60, 40],
  fehlschlag: [70, 50, 110],
  durchbruch: [35],
};

export function vibriere(anlass: Anlass, erlaubt: boolean): void {
  if (!erlaubt) return;
  try {
    navigator.vibrate?.([...MUSTER[anlass]]);
  } catch {
    // Geraet kann nicht vibrieren. Kein Grund, irgendetwas zu melden.
  }
}
