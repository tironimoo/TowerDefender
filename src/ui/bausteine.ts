/**
 * Kleine Helfer fuer die Oberflaeche.
 *
 * Die Menues sind HTML, nicht PixiJS. Forschungsbaum, Loadout-Auswahl und
 * Einstellungen sind Listen und Textlayouts, und genau dafuer ist HTML gemacht.
 * Siehe docs/03-architektur.md, Abschnitt Oberflaeche.
 */

type Kind = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attribute: Record<string, string | number | boolean | undefined> = {},
  kinder: readonly Kind[] = [],
): HTMLElementTagNameMap[K] {
  const knoten = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute)) {
    if (wert === undefined || wert === false) continue;
    if (name === 'class') knoten.className = String(wert);
    else if (name === 'text') knoten.textContent = String(wert);
    else if (wert === true) knoten.setAttribute(name, '');
    else knoten.setAttribute(name, String(wert));
  }
  for (const kind of kinder) {
    if (kind === null || kind === undefined || kind === false) continue;
    knoten.append(typeof kind === 'string' ? document.createTextNode(kind) : kind);
  }
  return knoten;
}

export function taste(
  beschriftung: string,
  bei: () => void,
  klassen = '',
): HTMLButtonElement {
  const knopf = el('button', { class: `taste ${klassen}`.trim(), type: 'button' }, [beschriftung]);
  knopf.addEventListener('click', (ereignis) => {
    ereignis.stopPropagation();
    bei();
  });
  return knopf;
}

export function wert(marke: string, inhalt: string, klasse = ''): HTMLElement {
  return el('div', { class: 'wert' }, [
    el('span', { class: 'marke' }, [marke]),
    el('span', { class: `zahl ${klasse}`.trim() }, [inhalt]),
  ]);
}

export function sterne(anzahl: number, von = 3): string {
  return '★'.repeat(anzahl) + '☆'.repeat(Math.max(0, von - anzahl));
}

export function leere(knoten: HTMLElement): void {
  while (knoten.firstChild !== null) knoten.removeChild(knoten.firstChild);
}

/** Zahl mit Tausenderpunkt, damit grosse Werte lesbar bleiben. */
export function formatiere(zahl: number): string {
  return Math.round(zahl).toLocaleString('de-DE');
}

export function fortschritt(anteil: number): HTMLElement {
  const balken = el('div', { class: 'fortschritt' }, [
    el('span', { style: `width:${Math.max(0, Math.min(1, anteil)) * 100}%` }),
  ]);
  return balken;
}
