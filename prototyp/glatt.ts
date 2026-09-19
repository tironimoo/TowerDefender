/**
 * Macht aus den Voxelkaesten geschliffene Koerper statt Klotzstapel.
 *
 * Die Modelldaten bleiben unveraendert: dieselben Listen achsenparalleler
 * Kaesten, aus denen der Sprite-Renderer flache Bilder zeichnet. Statt jeden
 * Kasten als Quader zu zeichnen, wird hier erst ein Abstandsfeld ueber das
 * ganze Teil gelegt - der Abstand jedes Punktes zur naechsten Kastenflaeche -
 * und daraus eine Huelle gezogen (Surface Nets).
 *
 * Zwei Dinge geben dem Ergebnis den handmodellierten Eindruck:
 *
 *  - Die Kaesten werden nicht hart vereinigt, sondern weich. Wo zwei Kaesten
 *    sich treffen, waechst dadurch eine Kehle statt einer scharfen Kante,
 *    genau wie bei einer geknautschten Tonfigur.
 *  - Die Huelle liegt nicht auf den Gitterlinien, sondern dort, wo das Feld
 *    null wird. Deshalb bleiben schraege Uebergaenge schraeg, statt in
 *    Stufen zu zerfallen.
 *
 * Die Silhouette bleibt erkennbar, das Spiel merkt davon nichts: hier faellt
 * nur eine andere Geometrie heraus.
 */

import * as THREE from 'three';
import type { RohKasten } from './meshbau';
import { VOXEL } from './meshbau';

/** Gitterpunkte je Voxel. Zwei reichen, weil die Huelle interpoliert wird. */
const DICHTE = 1;

/**
 * Wie weit die Kaesten ineinander verschmelzen, in Voxeln.
 *
 * Null ergibt harte Kanten wie beim Quaderbau. Ein knappes Voxel rundet
 * gerade so weit, dass das Auge "geschliffen" liest und die Form trotzdem
 * steht.
 */
export let verschmelzung = 0.5;
export function setzeVerschmelzung(wert: number): void {
  verschmelzung = wert;
}

/** Abstand eines Punktes zur Oberflaeche eines Kastens, negativ im Innern. */
function kastenAbstand(
  px: number,
  py: number,
  pz: number,
  kasten: RohKasten,
): number {
  const qx = Math.abs(px - kasten.pos[0]) - kasten.size[0] / 2;
  const qy = Math.abs(py - kasten.pos[1]) - kasten.size[1] / 2;
  const qz = Math.abs(pz - kasten.pos[2]) - kasten.size[2] / 2;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  const az = Math.max(qz, 0);
  const aussen = Math.sqrt(ax * ax + ay * ay + az * az);
  const innen = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
  return aussen + innen;
}

/** Weiche Vereinigung: erzeugt eine Kehle statt einer scharfen Naht. */
function weichesMin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

interface Feld {
  readonly werte: Float32Array;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly x0: number;
  readonly y0: number;
  readonly z0: number;
}

function baueFeld(kaesten: readonly RohKasten[]): Feld {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const k of kaesten) {
    minX = Math.min(minX, k.pos[0] - k.size[0] / 2);
    minY = Math.min(minY, k.pos[1] - k.size[1] / 2);
    minZ = Math.min(minZ, k.pos[2] - k.size[2] / 2);
    maxX = Math.max(maxX, k.pos[0] + k.size[0] / 2);
    maxY = Math.max(maxY, k.pos[1] + k.size[1] / 2);
    maxZ = Math.max(maxZ, k.pos[2] + k.size[2] / 2);
  }
  // Ein Voxel Luft ringsum, damit die Huelle geschlossen bleibt.
  const rand = 1 + verschmelzung;
  const x0 = minX - rand, y0 = minY - rand, z0 = minZ - rand;
  const nx = Math.ceil((maxX + rand - x0) * DICHTE) + 1;
  const ny = Math.ceil((maxY + rand - y0) * DICHTE) + 1;
  const nz = Math.ceil((maxZ + rand - z0) * DICHTE) + 1;
  const werte = new Float32Array(nx * ny * nz);
  for (let iz = 0; iz < nz; iz++) {
    const pz = z0 + iz / DICHTE;
    for (let iy = 0; iy < ny; iy++) {
      const py = y0 + iy / DICHTE;
      for (let ix = 0; ix < nx; ix++) {
        const px = x0 + ix / DICHTE;
        let d = Infinity;
        for (const k of kaesten) d = weichesMin(d, kastenAbstand(px, py, pz, k), verschmelzung);
        werte[(iz * ny + iy) * nx + ix] = d;
      }
    }
  }
  return { werte, nx, ny, nz, x0, y0, z0 };
}

/** Farbe des Kastens, dessen Flaeche dem Punkt am naechsten liegt. */
function naechsteFarbe(
  px: number,
  py: number,
  pz: number,
  kaesten: readonly RohKasten[],
): RohKasten {
  let beste = kaesten[0]!;
  let abstand = Infinity;
  for (const k of kaesten) {
    const d = kastenAbstand(px, py, pz, k);
    if (d < abstand) {
      abstand = d;
      beste = k;
    }
  }
  return beste;
}

const KANTEN: readonly (readonly [number, number])[] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const ECKEN: readonly (readonly [number, number, number])[] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];

const streufarbe = new THREE.Color();

/**
 * Zieht eine Huelle um die Kaesten und gibt sie als Geometrie zurueck.
 *
 * Null, wenn die Liste leer ist oder nichts uebrig bleibt - dieselbe
 * Vereinbarung wie beim Quaderbau.
 */
export function baueHuelle(kaesten: readonly RohKasten[]): THREE.BufferGeometry | null {
  if (kaesten.length === 0) return null;
  const feld = baueFeld(kaesten);
  const { werte, nx, ny, nz, x0, y0, z0 } = feld;

  const zelle = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const punkte: number[] = [];
  const ecke = new Float32Array(8);

  for (let iz = 0; iz < nz - 1; iz++) {
    for (let iy = 0; iy < ny - 1; iy++) {
      for (let ix = 0; ix < nx - 1; ix++) {
        let innen = 0;
        for (let e = 0; e < 8; e++) {
          const [dx, dy, dz] = ECKEN[e]!;
          const w = werte[((iz + dz) * ny + (iy + dy)) * nx + (ix + dx)]!;
          ecke[e] = w;
          if (w < 0) innen++;
        }
        if (innen === 0 || innen === 8) continue;

        // Schwerpunkt der Nulldurchgaenge auf den zwoelf Zellkanten.
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of KANTEN) {
          const wa = ecke[a]!;
          const wb = ecke[b]!;
          if (wa < 0 === wb < 0) continue;
          const t = wa / (wa - wb);
          const ea = ECKEN[a]!;
          const eb = ECKEN[b]!;
          sx += ea[0] + (eb[0] - ea[0]) * t;
          sy += ea[1] + (eb[1] - ea[1]) * t;
          sz += ea[2] + (eb[2] - ea[2]) * t;
          n++;
        }
        if (n === 0) continue;
        zelle[(iz * (ny - 1) + iy) * (nx - 1) + ix] = punkte.length / 3;
        punkte.push(
          x0 + (ix + sx / n) / DICHTE,
          y0 + (iy + sy / n) / DICHTE,
          z0 + (iz + sz / n) / DICHTE,
        );
      }
    }
  }
  if (punkte.length === 0) return null;

  // Jede Gitterkante mit Vorzeichenwechsel traegt ein Viereck aus den vier
  // Zellen, die sich diese Kante teilen.
  const dreiecke: number[] = [];
  const zellIndex = (x: number, y: number, z: number): number =>
    zelle[(z * (ny - 1) + y) * (nx - 1) + x]!;

  const viereck = (a: number, b: number, c: number, d: number, umdrehen: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (umdrehen) dreiecke.push(a, c, b, a, d, c);
    else dreiecke.push(a, b, c, a, c, d);
  };

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const w = werte[(iz * ny + iy) * nx + ix]!;
        const innen = w < 0;
        if (ix + 1 < nx && iy > 0 && iz > 0) {
          const w2 = werte[(iz * ny + iy) * nx + ix + 1]!;
          if (innen !== w2 < 0) {
            viereck(
              zellIndex(ix, iy - 1, iz - 1),
              zellIndex(ix, iy, iz - 1),
              zellIndex(ix, iy, iz),
              zellIndex(ix, iy - 1, iz),
              innen,
            );
          }
        }
        if (iy + 1 < ny && ix > 0 && iz > 0) {
          const w2 = werte[(iz * ny + iy + 1) * nx + ix]!;
          if (innen !== w2 < 0) {
            viereck(
              zellIndex(ix - 1, iy, iz - 1),
              zellIndex(ix, iy, iz - 1),
              zellIndex(ix, iy, iz),
              zellIndex(ix - 1, iy, iz),
              !innen,
            );
          }
        }
        if (iz + 1 < nz && ix > 0 && iy > 0) {
          const w2 = werte[((iz + 1) * ny + iy) * nx + ix]!;
          if (innen !== w2 < 0) {
            viereck(
              zellIndex(ix - 1, iy - 1, iz),
              zellIndex(ix, iy - 1, iz),
              zellIndex(ix, iy, iz),
              zellIndex(ix - 1, iy, iz),
              innen,
            );
          }
        }
      }
    }
  }
  if (dreiecke.length === 0) return null;

  const geometrie = new THREE.BufferGeometry();
  const lagen = new Float32Array(punkte.length);
  const farben = new Float32Array(punkte.length);
  for (let i = 0; i < punkte.length; i += 3) {
    const px = punkte[i]!, py = punkte[i + 1]!, pz = punkte[i + 2]!;
    lagen[i] = px * VOXEL;
    lagen[i + 1] = py * VOXEL;
    lagen[i + 2] = pz * VOXEL;
    const k = naechsteFarbe(px, py, pz, kaesten);
    streufarbe.set(k.color);
    farben[i] = streufarbe.r;
    farben[i + 1] = streufarbe.g;
    farben[i + 2] = streufarbe.b;
  }
  geometrie.setAttribute('position', new THREE.BufferAttribute(lagen, 3));
  geometrie.setAttribute('color', new THREE.BufferAttribute(farben, 3));
  geometrie.setIndex(dreiecke);
  // Indiziert lassen: die geteilten Ecken sind es, die weiche Normalen und
  // damit den geschliffenen Eindruck ergeben - und sie sparen das Sechsfache
  // an Daten.
  geometrie.computeVertexNormals();
  return geometrie;
}
