/**
 * Erzeugt App-Symbol und Startbild.
 *
 * Nutzt denselben Voxel-Renderer wie die Sprite-Blaetter, damit das Symbol
 * aussieht wie das Spiel und nicht wie ein Aufkleber daneben.
 *
 * Aufruf nur ueber `npm run icons`.
 */

import { renderModel } from '../voxel-render/voxel';
import { tower } from '../voxel-render/models/bausteine';
import { GEMEINSAM } from '../voxel-render/models/palette';
import { box } from '../voxel-render/models/bausteine';

const HINTERGRUND = '#1d2431';
const HINTERGRUND_RAND = '#0b0e14';

/** Ein voll ausgebauter Armbrustturm. Klare Silhouette, auch bei 48 Pixeln. */
const MOTIV = tower({
  id: 'symbol',
  base: GEMEINSAM.steinDunkel,
  mid: GEMEINSAM.stein,
  accent: GEMEINSAM.gold,
  glowColor: '#fff2b0',
  level: 3,
  // Bewusst schlicht: bei 48 Pixeln zaehlt nur die Silhouette.
  head: (y) => [
    box([0, y + 3, 0], [12, 6, 12], GEMEINSAM.holz),
    box([0, y + 8.5, 0], [5, 5, 11], GEMEINSAM.holzDunkel),
    box([0, y + 9, 1], [16, 2.4, 2.4], GEMEINSAM.holz),
    box([0, y + 9, 6.5], [3, 1.8, 5], GEMEINSAM.eisen),
    box([0, y + 6.2, 0], [13.5, 1.6, 13.5], GEMEINSAM.gold),
  ],
});

interface Zuschnitt {
  readonly canvas: HTMLCanvasElement;
  readonly breite: number;
  readonly hoehe: number;
}

/** Rendert das Motiv gross und schneidet es eng zu. */
function motivZuschneiden(): Zuschnitt {
  const gross = document.createElement('canvas');
  gross.width = 900;
  gross.height = 900;
  const ctx = gross.getContext('2d');
  if (ctx === null) throw new Error('Kein Canvas-Kontext.');

  renderModel(ctx, MOTIV, {
    yaw: 30,
    frame: 0,
    frameCount: 1,
    scale: 13,
    centerX: 450,
    groundY: 720,
  });

  const daten = ctx.getImageData(0, 0, gross.width, gross.height).data;
  let minX = gross.width;
  let minY = gross.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < gross.height; y++) {
    for (let x = 0; x < gross.width; x++) {
      if ((daten[(y * gross.width + x) * 4 + 3] ?? 0) > 6) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('Motiv ist leer.');

  const breite = maxX - minX + 1;
  const hoehe = maxY - minY + 1;
  const eng = document.createElement('canvas');
  eng.width = breite;
  eng.height = hoehe;
  const ectx = eng.getContext('2d');
  if (ectx === null) throw new Error('Kein Canvas-Kontext.');
  ectx.drawImage(gross, -minX, -minY);
  return { canvas: eng, breite, hoehe };
}

type Art = 'voll' | 'rund' | 'vordergrund' | 'start';

/**
 * Zeichnet das Symbol in einer Groesse.
 * `anteil` ist der Anteil der Kantenlaenge, den das Motiv einnimmt.
 */
function zeichne(motiv: Zuschnitt, groesse: number, art: Art, anteil: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = groesse;
  canvas.height = groesse;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Kein Canvas-Kontext.');

  if (art === 'voll' || art === 'rund' || art === 'start') {
    if (art === 'rund') {
      ctx.beginPath();
      ctx.arc(groesse / 2, groesse / 2, groesse / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    const verlauf = ctx.createRadialGradient(
      groesse * 0.5,
      groesse * 0.42,
      groesse * 0.1,
      groesse * 0.5,
      groesse * 0.5,
      groesse * 0.72,
    );
    verlauf.addColorStop(0, HINTERGRUND);
    verlauf.addColorStop(1, HINTERGRUND_RAND);
    ctx.fillStyle = verlauf;
    ctx.fillRect(0, 0, groesse, groesse);
  }

  const zielBreite = groesse * anteil;
  const massstab = Math.min(zielBreite / motiv.breite, zielBreite / motiv.hoehe);
  const breite = motiv.breite * massstab;
  const hoehe = motiv.hoehe * massstab;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    motiv.canvas,
    (groesse - breite) / 2,
    (groesse - hoehe) / 2 + groesse * 0.02,
    breite,
    hoehe,
  );

  return canvas.toDataURL('image/png');
}

interface Ausgabe {
  readonly pfad: string;
  readonly daten: string;
}

function erzeuge(): Ausgabe[] {
  const motiv = motivZuschneiden();
  const out: Ausgabe[] = [];

  const dichten: readonly { readonly ordner: string; readonly symbol: number; readonly vorder: number }[] =
    [
      { ordner: 'mipmap-mdpi', symbol: 48, vorder: 108 },
      { ordner: 'mipmap-hdpi', symbol: 72, vorder: 162 },
      { ordner: 'mipmap-xhdpi', symbol: 96, vorder: 216 },
      { ordner: 'mipmap-xxhdpi', symbol: 144, vorder: 324 },
      { ordner: 'mipmap-xxxhdpi', symbol: 192, vorder: 432 },
    ];

  for (const dichte of dichten) {
    out.push({
      pfad: `${dichte.ordner}/ic_launcher.png`,
      daten: zeichne(motiv, dichte.symbol, 'voll', 0.72),
    });
    out.push({
      pfad: `${dichte.ordner}/ic_launcher_round.png`,
      daten: zeichne(motiv, dichte.symbol, 'rund', 0.68),
    });
    // Beim anpassungsfaehigen Symbol schneidet das System bis zu einem Drittel
    // ab. Das Motiv bleibt deshalb in der inneren Flaeche.
    out.push({
      pfad: `${dichte.ordner}/ic_launcher_foreground.png`,
      daten: zeichne(motiv, dichte.vorder, 'vordergrund', 0.46),
    });
  }

  out.push({ pfad: 'drawable/startbild.png', daten: zeichne(motiv, 512, 'vordergrund', 0.62) });
  out.push({ pfad: 'symbol-512.png', daten: zeichne(motiv, 512, 'voll', 0.72) });

  return out;
}

const ergebnis = erzeuge();
const fenster = window as unknown as { __SYMBOLE?: Ausgabe[]; __FERTIG?: boolean };
fenster.__SYMBOLE = ergebnis;
fenster.__FERTIG = true;

const vorschau = document.getElementById('vorschau');
const stand = document.getElementById('stand');
if (stand !== null) stand.textContent = `Fertig: ${ergebnis.length} Bilder.`;
if (vorschau !== null) {
  for (const eintrag of ergebnis.slice(-2)) {
    const bild = new Image();
    bild.src = eintrag.daten;
    vorschau.appendChild(bild);
  }
}
