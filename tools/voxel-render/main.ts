/**
 * Renderseite der Grafik-Pipeline.
 *
 * Zeichnet jedes Modell in jeder Richtung und jedem Bewegungsbild, schneidet
 * die Bilder eng zu, packt sie zu Blaettern und legt das Ergebnis unter
 * `window.__ATLAS` ab. Das Bauskript in build.mjs holt es dort ab.
 *
 * Aufruf nur ueber `npm run assets`, nicht von Hand.
 */

import type { VoxelModel } from './voxel';
import { renderModel } from './voxel';
import type { AtlasFrame, AtlasSheet } from './atlas';
import {
  DIRECTIONS,
  RAHMEN,
  VOXEL_SCALE,
  WALK_FRAMES,
  frameKeyGegner,
  frameKeyGerichtet,
  frameKeyTurm,
} from './atlas';
import { BOSS_MODELS, CREATURE_MODELS } from './models/creatures';
import { TOWER_IDS, TOWER_MODELS } from './models/towers';
import { PROJECTILE_MODELS, PROP_MODELS, TILE_MODELS } from './models/welt';

const MAX_BREITE = 2048;

/** Farbe der Silhouettenkante. Hebt Figuren von jedem Untergrund ab. */
const UMRISS_FARBE = 'rgba(10,8,14,0.82)';

interface Mass {
  readonly w: number;
  readonly h: number;
  readonly ax: number;
  readonly ay: number;
}

interface Auftrag {
  readonly key: string;
  readonly model: VoxelModel;
  readonly yaw: number;
  readonly frame: number;
  readonly frameCount: number;
  readonly mass: Mass;
}

interface Blatt {
  readonly name: string;
  readonly auftraege: readonly Auftrag[];
}

interface GerendertesBild {
  readonly key: string;
  readonly canvas: HTMLCanvasElement;
  readonly ax: number;
  readonly ay: number;
}

interface Ergebnis {
  readonly blatt: AtlasSheet;
  readonly daten: string;
}

// --- Auftragslisten --------------------------------------------------------

function laufAuftraege(model: VoxelModel, mass: Mass): Auftrag[] {
  const out: Auftrag[] = [];
  for (let dir = 0; dir < DIRECTIONS; dir++) {
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      out.push({
        key: frameKeyGegner(model.id, dir, frame),
        model,
        yaw: dir * (360 / DIRECTIONS),
        frame,
        frameCount: WALK_FRAMES,
        mass,
      });
    }
  }
  return out;
}

function turmAuftraege(id: string): Auftrag[] {
  const out: Auftrag[] = [];
  for (let level = 0; level < 4; level++) {
    const model = TOWER_MODELS.find((entry) => entry.id === `${id}_s${level}`);
    if (model === undefined) throw new Error(`Turmmodell fehlt: ${id}_s${level}`);
    for (let dir = 0; dir < DIRECTIONS; dir++) {
      out.push({
        key: frameKeyTurm(id, level, dir),
        model,
        yaw: dir * (360 / DIRECTIONS),
        frame: 0,
        frameCount: 1,
        mass: RAHMEN.turm,
      });
    }
  }
  return out;
}

function weltAuftraege(): Auftrag[] {
  const out: Auftrag[] = [];
  for (const model of TILE_MODELS) {
    out.push({ key: model.id, model, yaw: 0, frame: 0, frameCount: 1, mass: RAHMEN.kachel });
  }
  for (const model of PROP_MODELS) {
    for (let dir = 0; dir < 4; dir++) {
      out.push({
        key: frameKeyGerichtet(model.id, dir),
        model,
        yaw: dir * 90,
        frame: 0,
        frameCount: 1,
        mass: RAHMEN.prop,
      });
    }
  }
  for (const model of PROJECTILE_MODELS) {
    for (let dir = 0; dir < DIRECTIONS; dir++) {
      out.push({
        key: frameKeyGerichtet(model.id, dir),
        model,
        yaw: dir * (360 / DIRECTIONS),
        frame: 0,
        frameCount: 1,
        mass: RAHMEN.schuss,
      });
    }
  }
  return out;
}

function alleBlaetter(): Blatt[] {
  const blaetter: Blatt[] = [];
  for (const model of CREATURE_MODELS) {
    blaetter.push({ name: `gegner-${model.id}`, auftraege: laufAuftraege(model, RAHMEN.gegner) });
  }
  for (const model of BOSS_MODELS) {
    blaetter.push({ name: `boss-${model.id}`, auftraege: laufAuftraege(model, RAHMEN.boss) });
  }
  for (const id of TOWER_IDS) {
    blaetter.push({ name: `turm-${id}`, auftraege: turmAuftraege(id) });
  }
  blaetter.push({ name: 'welt', auftraege: weltAuftraege() });
  return blaetter;
}

// --- Rendern und Zuschneiden ----------------------------------------------

const VERSATZ: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/**
 * Rendert einen Auftrag mit dunklem Umriss und schneidet ihn eng zu.
 *
 * Der Umriss entsteht, indem die Silhouette acht Mal um ein Pixel versetzt
 * gezeichnet und dann eingefaerbt wird. Ohne ihn verschwinden dunkle Gegner
 * vor dunklem Untergrund.
 *
 * Ohne Zuschnitt besteht mehr als die Haelfte jedes Blattes aus Leerraum, und
 * dieser Leerraum kostet auf dem Geraet echten Grafikspeicher.
 */
function rendereBild(
  scratch: HTMLCanvasElement,
  umriss: HTMLCanvasElement,
  auftrag: Auftrag,
): GerendertesBild | null {
  const sctx = scratch.getContext('2d');
  const octx = umriss.getContext('2d');
  if (sctx === null || octx === null) throw new Error('Kein Canvas-Kontext.');

  sctx.clearRect(0, 0, scratch.width, scratch.height);
  renderModel(sctx, auftrag.model, {
    yaw: auftrag.yaw,
    frame: auftrag.frame,
    frameCount: auftrag.frameCount,
    scale: VOXEL_SCALE,
    centerX: auftrag.mass.ax,
    groundY: auftrag.mass.ay,
  });

  octx.clearRect(0, 0, umriss.width, umriss.height);
  for (const [dx, dy] of VERSATZ) {
    octx.drawImage(scratch, dx, dy);
  }
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = UMRISS_FARBE;
  octx.fillRect(0, 0, umriss.width, umriss.height);
  octx.globalCompositeOperation = 'source-over';
  octx.drawImage(scratch, 0, 0);

  const grenzen = alphaGrenzen(octx, umriss.width, umriss.height);
  if (grenzen === null) return null;

  const zugeschnitten = document.createElement('canvas');
  zugeschnitten.width = grenzen.w;
  zugeschnitten.height = grenzen.h;
  const zctx = zugeschnitten.getContext('2d');
  if (zctx === null) throw new Error('Kein Canvas-Kontext.');
  zctx.drawImage(umriss, -grenzen.x, -grenzen.y);

  return {
    key: auftrag.key,
    canvas: zugeschnitten,
    ax: auftrag.mass.ax - grenzen.x,
    ay: auftrag.mass.ay - grenzen.y,
  };
}

function alphaGrenzen(
  ctx: CanvasRenderingContext2D,
  breite: number,
  hoehe: number,
): { x: number; y: number; w: number; h: number } | null {
  const daten = ctx.getImageData(0, 0, breite, hoehe).data;
  let minX = breite;
  let minY = hoehe;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      if ((daten[(y * breite + x) * 4 + 3] ?? 0) > 4) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Regalpacken. Hohe Bilder zuerst, das laesst weniger Luecken. */
function packe(bilder: readonly GerendertesBild[]): {
  breite: number;
  hoehe: number;
  rahmen: Record<string, AtlasFrame>;
  plaetze: { bild: GerendertesBild; x: number; y: number }[];
} {
  const sortiert = [...bilder].sort((a, b) =>
    b.canvas.height !== a.canvas.height
      ? b.canvas.height - a.canvas.height
      : a.key.localeCompare(b.key),
  );
  const rahmen: Record<string, AtlasFrame> = {};
  const plaetze: { bild: GerendertesBild; x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let zeilenHoehe = 0;
  let breite = 0;

  for (const bild of sortiert) {
    if (x + bild.canvas.width > MAX_BREITE) {
      x = 0;
      y += zeilenHoehe + 1;
      zeilenHoehe = 0;
    }
    plaetze.push({ bild, x, y });
    rahmen[bild.key] = { x, y, w: bild.canvas.width, h: bild.canvas.height, ax: bild.ax, ay: bild.ay };
    x += bild.canvas.width + 1;
    breite = Math.max(breite, x);
    zeilenHoehe = Math.max(zeilenHoehe, bild.canvas.height);
  }

  return { breite, hoehe: y + zeilenHoehe, rahmen, plaetze };
}

// --- Ablauf ----------------------------------------------------------------

async function rendere(): Promise<void> {
  const stand = document.getElementById('stand');
  const vorschau = document.getElementById('vorschau');
  const ergebnisse: Ergebnis[] = [];
  const blaetter = alleBlaetter();

  const scratch = document.createElement('canvas');
  const umriss = document.createElement('canvas');

  for (let i = 0; i < blaetter.length; i++) {
    const blatt = blaetter[i];
    if (blatt === undefined) continue;
    if (stand !== null) stand.textContent = `Blatt ${i + 1} von ${blaetter.length}: ${blatt.name}`;
    // Bewusst setTimeout statt requestAnimationFrame: ein Browser ohne
    // sichtbares Fenster drosselt die Bildwiederholung stark.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const bilder: GerendertesBild[] = [];
    let letzteBreite = -1;
    let letzteHoehe = -1;

    for (const auftrag of blatt.auftraege) {
      if (auftrag.mass.w !== letzteBreite || auftrag.mass.h !== letzteHoehe) {
        scratch.width = auftrag.mass.w;
        scratch.height = auftrag.mass.h;
        umriss.width = auftrag.mass.w;
        umriss.height = auftrag.mass.h;
        letzteBreite = auftrag.mass.w;
        letzteHoehe = auftrag.mass.h;
      }
      const bild = rendereBild(scratch, umriss, auftrag);
      if (bild !== null) bilder.push(bild);
    }

    const { breite, hoehe, rahmen, plaetze } = packe(bilder);
    const canvas = document.createElement('canvas');
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Kein Canvas-Kontext.');
    for (const platz of plaetze) {
      ctx.drawImage(platz.bild.canvas, platz.x, platz.y);
    }

    ergebnisse.push({
      blatt: { name: blatt.name, bild: `${blatt.name}.png`, breite, hoehe, rahmen },
      daten: canvas.toDataURL('image/png'),
    });

    if (vorschau !== null && i < 4) {
      canvas.style.width = `${Math.min(breite, 900)}px`;
      vorschau.appendChild(canvas);
    }
  }

  const fenster = window as unknown as { __ATLAS?: Ergebnis[]; __FERTIG?: boolean };
  fenster.__ATLAS = ergebnisse;
  fenster.__FERTIG = true;
  if (stand !== null) stand.textContent = `Fertig: ${ergebnisse.length} Blaetter.`;
}

void rendere();
