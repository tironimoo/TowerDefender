/**
 * Dauerhafter Speicher.
 *
 * Eine einzige Schnittstelle fuer Browser und Geraet. Im Browser ist es der
 * lokale Speicher, auf dem Geraet spaeter die Ablage von Capacitor. Der Rest
 * des Spiels merkt davon nichts.
 */

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

export const speicher: Speicher = new BrowserSpeicher();
