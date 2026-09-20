/**
 * Der Boden als durchgehende Flaeche statt als Kachelwuerfel.
 *
 * Ein Feld aus 1x1-Wuerfeln in zwei abwechselnden Gruentoenen ist ein
 * Minecraft-Grasfeld, ganz gleich wie es beleuchtet wird. Das Raster ist der
 * Stil, nicht nur seine Aufteilung.
 *
 * Hier wird stattdessen ein Hoehenfeld ueber die Karte gelegt und weich
 * abgetastet: jeder Punkt fragt nicht "welche Kachel bin ich", sondern
 * "welche Kacheln liegen in meiner Naehe, und wie nah". Damit bekommt der
 * Weg unscharfe Raender und der Boden eine sanfte Welle, und aus dem Gitter
 * wird eine Matte.
 *
 * Die Spiellogik merkt davon nichts. Das Raster liegt weiter darunter - es
 * wird nur nicht mehr gezeigt.
 */

import * as THREE from 'three';
import type { LevelDef, TileKind } from '@sim/index';

/** Unterteilungen je Kachel. Vier reichen fuer weiche Wegraender. */
const TEILUNG = 4;

/** Wie weit ueber die Kacheln gemittelt wird, in Kachelbreiten. */
const WEICHE = 1.45;

/** Wie weit das Feld ueber die Karte hinausreicht, in Kachelbreiten. */
const RAND = 1.6;

/** Wie tief der Rand abfaellt. */
const ABFALL = 2.6;

export interface BodenFarben {
  readonly gras: readonly [string, string];
  readonly weg: string;
  readonly bett: string;
  readonly fels: string;
  /** Erde an der Boeschung, dort wo die Insel abbricht. */
  readonly boeschung: string;
}

function rauschen(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Weiches Rauschen: vier Ecken einer Zelle, dazwischen gemittelt. */
function welle(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const gx = fx * fx * (3 - 2 * fx);
  const gz = fz * fz * (3 - 2 * fz);
  const a = rauschen(ix, iz);
  const b = rauschen(ix + 1, iz);
  const c = rauschen(ix, iz + 1);
  const d = rauschen(ix + 1, iz + 1);
  return (a + (b - a) * gx) * (1 - gz) + (c + (d - c) * gx) * gz;
}

const HOEHEN: Readonly<Record<TileKind, number>> = {
  boden: 0.16,
  weg: 0.085,
  fluessig: 0.0,
  fels: 0.3,
  leer: 0.16,
};

export interface Boden {
  readonly flaeche: THREE.BufferGeometry;
  /** Null, wenn die Karte kein Wasser hat. */
  readonly wasser: THREE.BufferGeometry | null;
  /** Hoehe des Bodens an einer Stelle, fuer alles, was darauf steht. */
  readonly hoeheBei: (x: number, z: number) => number;
}

export function baueBoden(level: LevelDef, farben: BodenFarben): Boden {
  const puffer = Math.round(RAND * TEILUNG);
  const nx = level.breite * TEILUNG + 1 + puffer * 2;
  const nz = level.hoehe * TEILUNG + 1 + puffer * 2;

  const art = (tx: number, tz: number): TileKind => {
    if (tx < 0 || tz < 0 || tx >= level.breite || tz >= level.hoehe) return 'leer';
    return level.kacheln[tz * level.breite + tx] ?? 'leer';
  };

  const farbe = new THREE.Color();
  const mischung = new THREE.Color();

  /**
   * Weiche Abtastung: alle Kacheln im Umkreis, gewichtet nach Abstand.
   * Das ist die ganze Zauberei - dadurch gibt es keine Kachelkanten mehr.
   */
  function taste(x: number, z: number): {
    hoehe: number;
    farbe: THREE.Color;
    wasser: number;
    anteil: number;
  } {
    const tx0 = Math.floor(x - WEICHE);
    const tz0 = Math.floor(z - WEICHE);
    const tx1 = Math.ceil(x + WEICHE);
    const tz1 = Math.ceil(z + WEICHE);
    let summe = 0;
    let leer = 0;
    let hoehe = 0;
    let wasser = 0;
    mischung.setRGB(0, 0, 0);
    for (let tz = tz0; tz <= tz1; tz++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const d = Math.hypot(tx + 0.5 - x, tz + 0.5 - z) / WEICHE;
        if (d >= 1) continue;
        const w = (1 - d) * (1 - d);
        const k = art(tx, tz);
        if (k === 'leer') {
          leer += w;
          continue;
        }
        // Gras bekommt zwei Toene, aber nicht im Schachbrett: das Rauschen
        // entscheidet, und es wechselt langsamer als die Kacheln.
        const ton =
          k === 'weg'
            ? farben.weg
            : k === 'fluessig'
              ? farben.bett
              : k === 'fels'
                ? farben.fels
                : welle(tx * 0.41, tz * 0.41) > 0.5
                  ? (farben.gras[0] ?? '#5c8a3e')
                  : (farben.gras[1] ?? '#5c8a3e');
        farbe.set(ton);
        mischung.r += farbe.r * w;
        mischung.g += farbe.g * w;
        mischung.b += farbe.b * w;
        hoehe += HOEHEN[k] * w;
        if (k === 'fluessig') wasser += w;
        summe += w;
      }
    }
    // Wie viel festes Land liegt hier in der Naehe? Am Rand faellt der Wert
    // von eins auf null, und genau daran haengt die abfallende Boeschung.
    // Ohne sie ist die Insel ein Blatt Papier.
    const anteil = summe + leer > 0 ? summe / (summe + leer) : 0;
    if (summe === 0) {
      return {
        hoehe: -ABFALL,
        farbe: mischung.set(farben.boeschung),
        wasser: 0,
        anteil: 0,
      };
    }
    mischung.multiplyScalar(1 / summe);
    const kante = 1 - anteil;
    mischung.lerp(farbe.set(farben.boeschung), Math.min(1, kante * 1.6));
    return {
      hoehe: hoehe / summe - Math.pow(kante, 1.3) * ABFALL,
      farbe: mischung,
      wasser: wasser / summe,
      anteil,
    };
  }

  const lagen = new Float32Array(nx * nz * 3);
  const farbwerte = new Float32Array(nx * nz * 3);
  const hoehen = new Float32Array(nx * nz);

  const anteile = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = (ix - puffer) / TEILUNG;
      const z = (iz - puffer) / TEILUNG;
      const probe = taste(x, z);
      // Sanfte Welle darueber. Ohne sie bleibt die Flaeche ein Brett, und
      // ein Brett sieht wieder nach Computer aus.
      const hoehe = probe.hoehe + (welle(x * 0.55, z * 0.55) - 0.5) * 0.055 * probe.anteil;
      anteile[iz * nx + ix] = probe.anteil;
      const k = (iz * nx + ix) * 3;
      lagen[k] = x;
      lagen[k + 1] = hoehe;
      lagen[k + 2] = z;
      hoehen[iz * nx + ix] = hoehe;
      // Farbsprenkel wie bei bemaltem Filz.
      const streu = 0.88 + welle(x * 3.1, z * 3.1) * 0.24;
      farbwerte[k] = probe.farbe.r * streu;
      farbwerte[k + 1] = probe.farbe.g * streu;
      farbwerte[k + 2] = probe.farbe.b * streu;
    }
  }

  const dreiecke: number[] = [];
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const c = (iz + 1) * nx + ix;
      const d = c + 1;
      // Ganz aussen aufhoeren: dort liegt nur noch Luft, und die Boeschung
      // ist laengst unten angekommen.
      const rand =
        (anteile[a] ?? 0) + (anteile[b] ?? 0) + (anteile[c] ?? 0) + (anteile[d] ?? 0);
      if (rand <= 0.001) continue;
      dreiecke.push(a, c, b, b, c, d);
    }
  }

  const flaeche = new THREE.BufferGeometry();
  flaeche.setAttribute('position', new THREE.BufferAttribute(lagen, 3));
  flaeche.setAttribute('color', new THREE.BufferAttribute(farbwerte, 3));
  flaeche.setIndex(dreiecke);
  flaeche.computeVertexNormals();

  // --- Wasser --------------------------------------------------------------
  // Eine eigene Flaeche knapp ueber dem Bett, damit sie spiegeln kann,
  // waehrend der Grund darunter matt bleibt.
  const wasserLagen: number[] = [];
  const wasserIndex: number[] = [];
  for (let tz = 0; tz < level.hoehe; tz++) {
    for (let tx = 0; tx < level.breite; tx++) {
      if (art(tx, tz) !== 'fluessig') continue;
      // Wo kein Wasser anschliesst, die Kante einziehen: sonst endet der
      // Tuempel als gerade abgeschnittenes blaues Blatt, und am Inselrand
      // steht er sogar in der Luft.
      const ein = (dx: number, dz: number): number =>
        art(tx + dx, tz + dz) === 'fluessig' ? 0 : 0.34;
      const x0 = tx + ein(-1, 0);
      const x1 = tx + 1 - ein(1, 0);
      const z0 = tz + ein(0, -1);
      const z1 = tz + 1 - ein(0, 1);
      const n = wasserLagen.length / 3;
      const y = 0.055;
      wasserLagen.push(x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1);
      wasserIndex.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  let wasser: THREE.BufferGeometry | null = null;
  if (wasserLagen.length > 0) {
    wasser = new THREE.BufferGeometry();
    wasser.setAttribute('position', new THREE.Float32BufferAttribute(wasserLagen, 3));
    wasser.setIndex(wasserIndex);
    wasser.computeVertexNormals();
  }

  const hoeheBei = (x: number, z: number): number => {
    const ix = Math.max(0, Math.min(nx - 1, Math.round(x * TEILUNG) + puffer));
    const iz = Math.max(0, Math.min(nz - 1, Math.round(z * TEILUNG) + puffer));
    return hoehen[iz * nx + ix] ?? HOEHEN.boden;
  };

  return { flaeche, wasser, hoeheBei };
}
