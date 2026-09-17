/**
 * Kleiner Voxel-Renderer.
 *
 * Zeichnet Modelle aus achsenparallelen Kaesten in dimetrischer Ansicht auf ein
 * gewoehnliches Canvas. Kein 3D-Werkzeug noetig, weil jede orthografische
 * Abbildung eines Rechtecks wieder ein Parallelogramm ist. Jede Flaeche wird in
 * Voxelzellen unterteilt und leicht unterschiedlich eingefaerbt. Genau daraus
 * entsteht der koernige Klotz-Look.
 *
 * Koordinaten: x nach rechts, y nach oben, z nach hinten. Eine Einheit ist ein
 * Voxel. Eine humanoide Figur ist ungefaehr 28 Einheiten hoch.
 */

export interface VoxelBox {
  /** Mittelpunkt des Kastens in Modellkoordinaten. */
  readonly pos: readonly [number, number, number];
  readonly size: readonly [number, number, number];
  readonly color: string;
  /** Zusaetzliche Aufhellung, etwa fuer leuchtende Teile. */
  readonly glow?: number;
  /** Staerke der Koernung. Null ergibt eine glatte Flaeche. */
  readonly grain?: number;
}

export type SwingAxis = 'x' | 'y' | 'z';

export interface VoxelPart {
  readonly name: string;
  /** Drehpunkt in Modellkoordinaten. */
  readonly pivot: readonly [number, number, number];
  readonly boxes: readonly VoxelBox[];
  /** Pendelbewegung, etwa fuer Beine und Arme. */
  readonly swing?: { readonly axis: SwingAxis; readonly amp: number; readonly phase: number };
  /** Auf und ab, in Voxeln. */
  readonly bob?: { readonly amp: number; readonly phase: number };
}

export interface VoxelModel {
  readonly id: string;
  readonly parts: readonly VoxelPart[];
  /** Hoehe ueber dem Boden, fuer Flieger. */
  readonly hover?: number;
}

export interface RenderOptions {
  /** Drehung des Modells um die Hochachse, in Grad. */
  readonly yaw: number;
  /** Bild der Bewegungsschleife. */
  readonly frame: number;
  readonly frameCount: number;
  /** Pixel je Voxel. */
  readonly scale: number;
  readonly centerX: number;
  /** Bildschirmzeile, auf der der Boden des Modells liegt. */
  readonly groundY: number;
}

/**
 * Dimetrische Kamera, fest fuer das ganze Spiel.
 * Gierung 45 Grad und Neigung 30 Grad ergeben eine Bodenkachel im Verhaeltnis
 * genau zwei zu eins. Das haelt alle Pixelmasse rund.
 */
const CAMERA_YAW = (45 * Math.PI) / 180;
const CAMERA_PITCH = (30 * Math.PI) / 180;
const COS_YAW = Math.cos(CAMERA_YAW);
const SIN_YAW = Math.sin(CAMERA_YAW);
const COS_PITCH = Math.cos(CAMERA_PITCH);
const SIN_PITCH = Math.sin(CAMERA_PITCH);

/** Lichtrichtung in Weltkoordinaten. Zeigt zur Lichtquelle. */
const LIGHT: readonly [number, number, number] = normalize([-0.45, 0.82, -0.35]);
const AMBIENT = 0.42;

/**
 * Richtung von der Flaeche zur Kamera, in Weltkoordinaten.
 * Ergibt sich als Kreuzprodukt der beiden Bildschirmachsen und stimmt damit
 * genau mit der Tiefenformel in `project` ueberein: groessere Tiefe heisst
 * naeher an der Kamera.
 */
const TO_CAMERA: readonly [number, number, number] = [
  -SIN_YAW * COS_PITCH,
  SIN_PITCH,
  COS_YAW * COS_PITCH,
];

type Vec3 = readonly [number, number, number];

function normalize(v: Vec3): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function rotateY(p: Vec3, angle: number): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

function rotateAxis(p: Vec3, axis: SwingAxis, angle: number): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  if (axis === 'x') return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  if (axis === 'y') return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

interface Projected {
  readonly sx: number;
  readonly sy: number;
  readonly depth: number;
}

function project(p: Vec3, options: RenderOptions): Projected {
  const x = p[0] * COS_YAW + p[2] * SIN_YAW;
  const z = -p[0] * SIN_YAW + p[2] * COS_YAW;
  return {
    sx: options.centerX + x * options.scale,
    sy: options.groundY - (p[1] * COS_PITCH - z * SIN_PITCH) * options.scale,
    depth: p[1] * SIN_PITCH + z * COS_PITCH,
  };
}

/** Deterministisches Rauschen. Gleiche Zelle ergibt immer denselben Wert. */
function cellNoise(a: number, b: number, c: number): number {
  let h = Math.imul(a * 374761393 + b * 668265263 + c * 1274126177, 1274126177);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 1000) / 1000;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseColor(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function shade(color: Rgb, factor: number): string {
  const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return `rgb(${clampByte(color.r * factor)},${clampByte(color.g * factor)},${clampByte(color.b * factor)})`;
}

/** Die sechs Flaechen eines Einheitskastens als Eckindizes und Normale. */
const FACES: readonly { readonly corners: readonly [number, number, number, number]; readonly normal: Vec3 }[] = [
  { corners: [4, 5, 7, 6], normal: [0, 1, 0] }, // oben
  { corners: [0, 2, 3, 1], normal: [0, -1, 0] }, // unten
  { corners: [2, 6, 7, 3], normal: [0, 0, 1] }, // hinten
  { corners: [1, 3, 7, 5], normal: [1, 0, 0] }, // rechts
  { corners: [0, 4, 6, 2], normal: [-1, 0, 0] }, // links
  { corners: [0, 1, 5, 4], normal: [0, 0, -1] }, // vorn
];

interface FaceDraw {
  readonly depth: number;
  readonly textur: HTMLCanvasElement;
  /** Affine Abbildung vom Einheitsquadrat auf das Parallelogramm. */
  readonly m: readonly [number, number, number, number, number, number];
}

/**
 * Texturen werden zwischengespeichert.
 *
 * Eine Flaeche wird nicht mehr aus vielen kleinen Vierecken zusammengesetzt,
 * sondern als ein einziges Parallelogramm mit einer kleinen Textur gefuellt.
 * Das beseitigt die Haarlinien zwischen den Zellen und ist deutlich schneller.
 */
const texturCache = new Map<string, HTMLCanvasElement>();

function holeTextur(
  color: string,
  brightness: number,
  cellsU: number,
  cellsV: number,
  grain: number,
  seed: number,
): HTMLCanvasElement {
  const key = `${color}|${brightness.toFixed(3)}|${cellsU}x${cellsV}|${grain.toFixed(3)}|${seed}`;
  const vorhanden = texturCache.get(key);
  if (vorhanden !== undefined) return vorhanden;

  const canvas = document.createElement('canvas');
  canvas.width = cellsU;
  canvas.height = cellsV;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Kein Canvas-Kontext fuer die Textur.');

  const base = parseColor(color);
  for (let iu = 0; iu < cellsU; iu++) {
    for (let iv = 0; iv < cellsV; iv++) {
      const noise = cellNoise(iu + seed * 7, iv + seed * 13, seed);
      const variation = 1 + (noise - 0.5) * 2 * grain;
      ctx.fillStyle = shade(base, brightness * variation);
      ctx.fillRect(iu, iv, 1, 1);
    }
  }

  texturCache.set(key, canvas);
  return canvas;
}

/**
 * Zeichnet ein Modell.
 * `ctx` muss ein gewoehnlicher Canvas-Kontext sein.
 */
export function renderModel(
  ctx: CanvasRenderingContext2D,
  model: VoxelModel,
  options: RenderOptions,
): void {
  const yaw = (options.yaw * Math.PI) / 180;
  const phase = options.frameCount <= 1 ? 0 : (options.frame / options.frameCount) * Math.PI * 2;
  const faces: FaceDraw[] = [];

  for (const part of model.parts) {
    const swingAngle =
      part.swing === undefined ? 0 : Math.sin(phase + part.swing.phase) * part.swing.amp;
    const bob = part.bob === undefined ? 0 : Math.sin(phase + part.bob.phase) * part.bob.amp;
    const hover = model.hover ?? 0;

    for (const box of part.boxes) {
      collectBoxFaces(faces, box, part, swingAngle, bob + hover, yaw, options);
    }
  }

  // Weit nach nah zeichnen. Kleinere Tiefe liegt weiter von der Kamera weg.
  faces.sort((a, b) => a.depth - b.depth);

  const vorherigeGlaettung = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  for (const face of faces) {
    ctx.setTransform(face.m[0], face.m[1], face.m[2], face.m[3], face.m[4], face.m[5]);
    ctx.drawImage(face.textur, 0, 0, 1, 1);
  }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = vorherigeGlaettung;
}

function collectBoxFaces(
  out: FaceDraw[],
  box: VoxelBox,
  part: VoxelPart,
  swingAngle: number,
  lift: number,
  yaw: number,
  options: RenderOptions,
): void {
  const half: Vec3 = [box.size[0] / 2, box.size[1] / 2, box.size[2] / 2];
  const grain = box.grain ?? 0.09;
  const glow = box.glow ?? 0;
  const seed =
    Math.round(box.pos[0] * 8) * 31 + Math.round(box.pos[1] * 8) * 17 + Math.round(box.pos[2] * 8) * 7;

  const toModel = (ux: number, uy: number, uz: number): [number, number, number] => {
    let p: Vec3 = [box.pos[0] + ux * half[0], box.pos[1] + uy * half[1], box.pos[2] + uz * half[2]];
    if (part.swing !== undefined && swingAngle !== 0) {
      const local: Vec3 = [p[0] - part.pivot[0], p[1] - part.pivot[1], p[2] - part.pivot[2]];
      const turned = rotateAxis(local, part.swing.axis, swingAngle);
      p = [turned[0] + part.pivot[0], turned[1] + part.pivot[1], turned[2] + part.pivot[2]];
    }
    return rotateY([p[0], p[1] + lift, p[2]], yaw);
  };

  for (const face of FACES) {
    const worldNormal = rotateY(face.normal, yaw);
    // Rueckseiten weglassen: sichtbar ist, wessen Normale zur Kamera zeigt.
    const towardsCamera =
      worldNormal[0] * TO_CAMERA[0] +
      worldNormal[1] * TO_CAMERA[1] +
      worldNormal[2] * TO_CAMERA[2];
    if (towardsCamera <= 0.001) continue;

    const brightness = Math.min(
      1.7,
      AMBIENT +
        (1 - AMBIENT) *
          Math.max(
            0,
            worldNormal[0] * LIGHT[0] + worldNormal[1] * LIGHT[1] + worldNormal[2] * LIGHT[2],
          ) +
        glow,
    );

    const axes = faceAxes(face.normal);
    const cellsU = Math.max(1, Math.min(16, Math.round(box.size[axes.u])));
    const cellsV = Math.max(1, Math.min(16, Math.round(box.size[axes.v])));

    const ecke = (u: number, v: number): [number, number, number] => {
      const signs: [number, number, number] = [0, 0, 0];
      signs[axes.n] = face.normal[axes.n];
      signs[axes.u] = u;
      signs[axes.v] = v;
      return toModel(signs[0], signs[1], signs[2]);
    };

    const p00 = project(ecke(-1, -1), options);
    const p10 = project(ecke(1, -1), options);
    const p01 = project(ecke(-1, 1), options);
    const p11 = project(ecke(1, 1), options);

    // Um ein halbes Pixel aufblasen, damit an den Kanten keine Luecke bleibt.
    const ux = p10.sx - p00.sx;
    const uy = p10.sy - p00.sy;
    const vx = p01.sx - p00.sx;
    const vy = p01.sy - p00.sy;
    const ul = Math.hypot(ux, uy) || 1;
    const vl = Math.hypot(vx, vy) || 1;
    const padU = 0.5 / ul;
    const padV = 0.5 / vl;
    const ax = ux * (1 + 2 * padU);
    const ay = uy * (1 + 2 * padU);
    const bx = vx * (1 + 2 * padV);
    const by = vy * (1 + 2 * padV);
    const ox = p00.sx - ux * padU - vx * padV;
    const oy = p00.sy - uy * padU - vy * padV;

    out.push({
      depth: (p00.depth + p10.depth + p01.depth + p11.depth) / 4,
      textur: holeTextur(box.color, brightness, cellsU, cellsV, grain, seed + axes.n),
      m: [ax, ay, bx, by, ox, oy],
    });
  }
}

function faceAxes(normal: Vec3): { n: 0 | 1 | 2; u: 0 | 1 | 2; v: 0 | 1 | 2 } {
  if (normal[1] !== 0) return { n: 1, u: 0, v: 2 };
  if (normal[0] !== 0) return { n: 0, u: 2, v: 1 };
  return { n: 2, u: 0, v: 1 };
}
