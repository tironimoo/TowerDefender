/**
 * Dauerhafter Speicher.
 *
 * Eine einzige Schnittstelle fuer Browser und Geraet. Im Browser ist es der
 * lokale Speicher, in der App die Ablage von Capacitor. Der Rest des Spiels
 * merkt davon nichts.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface Speicher {
  lies(schluessel: string): Promise<string | null>;
  schreibe(schluessel: string, wert: string): Promise<void>;
  entferne(schluessel: string): Promise<void>;
}

class BrowserSpeicher implements Speicher {
  async lies(schluessel: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(schluessel);
    } catch {
      // Privates Fenster oder gesperrte Seitendaten. Kein Grund abzustuerzen.
      return null;
    }
  }

  async schreibe(schluessel: string, wert: string): Promise<void> {
    try {
      window.localStorage.setItem(schluessel, wert);
    } catch {
      // Speicher voll oder gesperrt. Der Spielstand geht verloren, das Spiel
      // laeuft weiter.
    }
  }

  async entferne(schluessel: string): Promise<void> {
    try {
      window.localStorage.removeItem(schluessel);
    } catch {
      // Nichts zu tun.
    }
  }
}

/**
 * Ablage auf dem Geraet.
 *
 * Der lokale Speicher einer eingebetteten Ansicht kann vom System geleert
 * werden. Die Ablage von Capacitor bleibt erhalten, und genau dort gehoert ein
 * Spielstand hin.
 */
class GeraeteSpeicher implements Speicher {
  private readonly ersatz = new BrowserSpeicher();

  async lies(schluessel: string): Promise<string | null> {
    try {
      const antwort = await Preferences.get({ key: schluessel });
      return antwort.value;
    } catch {
      return this.ersatz.lies(schluessel);
    }
  }

  async schreibe(schluessel: string, wert: string): Promise<void> {
    try {
      await Preferences.set({ key: schluessel, value: wert });
    } catch {
      await this.ersatz.schreibe(schluessel, wert);
    }
  }

  async entferne(schluessel: string): Promise<void> {
    try {
      await Preferences.remove({ key: schluessel });
    } catch {
      await this.ersatz.entferne(schluessel);
    }
  }
}

function waehle(): Speicher {
  try {
    return Capacitor.isNativePlatform() ? new GeraeteSpeicher() : new BrowserSpeicher();
  } catch {
    return new BrowserSpeicher();
  }
}

export const speicher: Speicher = waehle();
