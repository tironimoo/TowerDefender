/**
 * Das Bedienfeld des Prototyps.
 *
 * Ein Prototyp, der nur ein Bild zeigt, beantwortet die Frage nicht. Die
 * Frage lautet ja nicht "gefaellt dir dieses eine Bild", sondern "wohin soll
 * das gehen" - und die laesst sich nur beantworten, wenn man selbst daran
 * drehen kann.
 *
 * Deshalb haengt hier jeder Wert, der den Stil ausmacht, an einem Regler, und
 * die sinnvollen Kombinationen liegen als Stimmungen auf Tasten. Das Feld ist
 * bewusst zusammenklappbar: auf einem Handy soll es das Bild nicht auffressen.
 */

export interface Regler {
  readonly id: string;
  readonly name: string;
  readonly von: number;
  readonly bis: number;
  readonly schritt: number;
  readonly wert: number;
  /** Zeigt den Wert lesbar an, etwa als Prozent. */
  readonly zeige?: (wert: number) => string;
  readonly setze: (wert: number) => void;
}

export interface Gruppe {
  readonly name: string;
  readonly regler: readonly Regler[];
}

export interface Stimmung {
  readonly name: string;
  /** Reglerwerte, die diese Stimmung setzt. Fehlende bleiben, wie sie sind. */
  readonly werte: Readonly<Record<string, number>>;
  /** Alles, was kein Regler ist: Farben, Lichtrichtung, Nebel. */
  readonly dann?: () => void;
}

export interface Bedienfeld {
  /** Setzt Regler auf neue Werte und zieht die Schieber nach. */
  readonly uebernimm: (werte: Readonly<Record<string, number>>) => void;
}

const STIL = `
#feld {
  position: absolute; right: 0; top: 0; z-index: 5;
  width: min(310px, 82vw); max-height: 100%;
  display: flex; flex-direction: column;
  background: rgba(14, 18, 24, 0.86);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(160, 200, 230, 0.18);
  color: #e8eef2;
  transform: translateX(0); transition: transform 0.22s ease;
}
#feld.zu { transform: translateX(100%); }
#feldgriff {
  position: absolute; right: 100%; top: 14px;
  padding: 10px 12px; min-height: 40px;
  background: rgba(14, 18, 24, 0.86);
  border: 1px solid rgba(160, 200, 230, 0.18); border-right: 0;
  color: #e8eef2; font: inherit; font-weight: 600; cursor: pointer;
  pointer-events: auto;
}
#feldinhalt { overflow-y: auto; padding: 12px 14px calc(14px + env(safe-area-inset-bottom)); }
#feld h2 {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: #7f97ab; margin: 14px 0 7px;
}
#feld h2:first-child { margin-top: 0; }
#feld .stimmungen { display: flex; flex-wrap: wrap; gap: 6px; }
#feld .stimmungen button {
  flex: 1 1 auto; padding: 7px 10px; min-height: 34px; font-size: 12px;
  background: rgba(36, 48, 62, 0.9); border: 1px solid rgba(160, 200, 230, 0.22);
  color: #e8eef2; cursor: pointer;
}
#feld .stimmungen button.aktiv { background: #3d6c96; border-color: #7fb4dc; }
#feld label { display: block; margin: 9px 0 0; font-size: 12px; }
#feld .zeile { display: flex; justify-content: space-between; color: #b9c8d4; }
#feld .zeile span:last-child { color: #8fd0ff; font-variant-numeric: tabular-nums; }
#feld input[type=range] {
  width: 100%; margin: 3px 0 0; height: 26px; accent-color: #6aa9d8; background: none;
}
`;

export function baueBedienfeld(
  wurzel: HTMLElement,
  gruppen: readonly Gruppe[],
  stimmungen: readonly Stimmung[],
): Bedienfeld {
  const stil = document.createElement('style');
  stil.textContent = STIL;
  document.head.appendChild(stil);

  const feld = document.createElement('div');
  feld.id = 'feld';
  const griff = document.createElement('button');
  griff.id = 'feldgriff';
  griff.type = 'button';
  griff.textContent = 'Regler';
  griff.addEventListener('click', () => feld.classList.toggle('zu'));
  feld.appendChild(griff);

  const inhalt = document.createElement('div');
  inhalt.id = 'feldinhalt';
  feld.appendChild(inhalt);

  const schieber = new Map<string, { eingabe: HTMLInputElement; regler: Regler; wert: HTMLElement }>();

  if (stimmungen.length > 0) {
    const kopf = document.createElement('h2');
    kopf.textContent = 'Stimmung';
    inhalt.appendChild(kopf);
    const reihe = document.createElement('div');
    reihe.className = 'stimmungen';
    for (const stimmung of stimmungen) {
      const taste = document.createElement('button');
      taste.type = 'button';
      taste.textContent = stimmung.name;
      taste.addEventListener('click', () => {
        for (const andere of reihe.children) andere.classList.remove('aktiv');
        taste.classList.add('aktiv');
        stimmung.dann?.();
        uebernimm(stimmung.werte);
      });
      reihe.appendChild(taste);
    }
    reihe.firstElementChild?.classList.add('aktiv');
    inhalt.appendChild(reihe);
  }

  for (const gruppe of gruppen) {
    const kopf = document.createElement('h2');
    kopf.textContent = gruppe.name;
    inhalt.appendChild(kopf);
    for (const regler of gruppe.regler) {
      const beschriftung = document.createElement('label');
      const zeile = document.createElement('div');
      zeile.className = 'zeile';
      const name = document.createElement('span');
      name.textContent = regler.name;
      const wert = document.createElement('span');
      zeile.append(name, wert);
      const eingabe = document.createElement('input');
      eingabe.type = 'range';
      eingabe.min = String(regler.von);
      eingabe.max = String(regler.bis);
      eingabe.step = String(regler.schritt);
      eingabe.value = String(regler.wert);
      const zeigen = (w: number): void => {
        wert.textContent = regler.zeige ? regler.zeige(w) : w.toFixed(2);
      };
      zeigen(regler.wert);
      eingabe.addEventListener('input', () => {
        const w = Number(eingabe.value);
        zeigen(w);
        regler.setze(w);
      });
      beschriftung.append(zeile, eingabe);
      inhalt.appendChild(beschriftung);
      schieber.set(regler.id, { eingabe, regler, wert });
    }
  }

  function uebernimm(werte: Readonly<Record<string, number>>): void {
    for (const [id, w] of Object.entries(werte)) {
      const eintrag = schieber.get(id);
      if (eintrag === undefined) continue;
      eintrag.eingabe.value = String(w);
      eintrag.wert.textContent = eintrag.regler.zeige ? eintrag.regler.zeige(w) : w.toFixed(2);
      eintrag.regler.setze(w);
    }
  }

  // Auf einem schmalen Schirm nimmt das Feld sonst das halbe Bild weg, und
  // das Bild ist hier der Gegenstand.
  if (window.innerWidth < 900) feld.classList.add('zu');

  wurzel.appendChild(feld);
  return { uebernimm };
}
