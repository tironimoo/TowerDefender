/**
 * Einstiegspunkt.
 *
 * Baut die Anwendung auf und startet sie. Alles Weitere liegt in app/spiel.ts.
 */

import './ui/stil.css';
import { Spiel } from '@app/spiel';
import { meldeDienstarbeiterAn } from '@platform/dienstarbeiter';

async function start(): Promise<void> {
  const spielfeld = document.getElementById('spielfeld');
  const ui = document.getElementById('ui-wurzel');
  if (spielfeld === null || ui === null) throw new Error('Grundgeruest fehlt.');

  const spiel = new Spiel();
  try {
    await spiel.starte(spielfeld, ui);
  } catch (fehler) {
    // Ein Fehler beim Start darf nicht in einem schwarzen Bildschirm enden.
    ui.innerHTML = '';
    const tafel = document.createElement('div');
    tafel.className = 'ueberlagerung';
    tafel.innerHTML =
      '<div class="tafel dialog"><h1>Start fehlgeschlagen</h1>' +
      `<p class="schwach">${String(fehler)}</p>` +
      '<p class="schwach">Wurden die Sprite-Blaetter erzeugt? npm run assets</p></div>';
    ui.appendChild(tafel);
    throw fehler;
  }
}

meldeDienstarbeiterAn();
void start();
