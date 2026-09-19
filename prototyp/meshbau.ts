/**
 * Baut aus den Voxelmodellen echte Koerper.
 *
 * Die Modelle sind Listen achsenparalleler Kaesten - dieselben, aus denen der
 * Sprite-Renderer flache Bilder zeichnet. Hier wird jeder Kasten zu einem
 * Quader und alle Quader eines Teils zu einer einzigen Geometrie
 * zusammengefasst. Ein Gegner mit sechs Koerperteilen ist damit sechs
 * Geometrien statt vierzig Quadern.
 *
 * Leuchtende Kaesten kommen in eine eigene Geometrie. Sie bekommen ein
 * selbstleuchtendes Material, und genau daran haengt spaeter der Bluehen-Effekt:
 * was leuchtet, strahlt in die Umgebung ab.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { baueHuelle } from './glatt';

/** Eine Voxeleinheit in Weltmass. Sechzehn Voxel sind eine Kachel. */
export const VOXEL = 1 / 16;

export interface RohKasten {
  readonly pos: readonly [number, number, number];
  readonly size: readonly [number, number, number];
  readonly color: string;
  readonly glow?: number;
  readonly grain?: number;
}

export interface RohTeil {
  readonly name: string;
  readonly pivot: readonly [number, number, number];
  readonly boxes: readonly RohKasten[];
  readonly swing?: { readonly axis: 'x' | 'y' | 'z'; readonly amp: number; readonly phase: number };
  readonly bob?: { readonly amp: number; readonly phase: number };
}

export interface RohModell {
  readonly id: string;
  readonly parts: readonly RohTeil[];
  readonly hover?: number;
}

/** Ein baufertiges Teil: Geometrie plus alles, was die Bewegung braucht. */
export interface TeilBau {
  readonly name: string;
  /** Null, wenn dieses Teil nur leuchtende Kaesten hat. */
  readonly fest: THREE.BufferGeometry | null;
  readonly leuchtend: THREE.BufferGeometry | null;
  readonly pivot: THREE.Vector3;
  readonly swing: RohTeil['swing'];
  readonly bob: RohTeil['bob'];
}

export interface ModellBau {
  readonly id: string;
  readonly teile: readonly TeilBau[];
  readonly hover: number;
  /** Hoehe des Modells in Weltmass, fuer Lebensbalken und Kamera. */
  readonly hoehe: number;
}

const farbe = new THREE.Color();

/**
 * Leichte Farbstreuung je Kasten.
 *
 * Der Sprite-Renderer koernt jede Flaeche zellweise ein; das ist der Grund,
 * warum die Bilder nicht nach Plastik aussehen. In 3D waere das je Voxel zu
 * teuer, deshalb streut hier jeder Kasten ein wenig um seinen Farbton. Der
 * Wert haengt an der Position, damit derselbe Kasten immer gleich aussieht.
 */
function streuung(x: number, y: number, z: number, staerke: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return 1 + (n - Math.floor(n) - 0.5) * staerke;
}

/**
 * Wie stark die Kanten gebrochen werden, als Anteil der kuerzesten Seite.
 *
 * Null ergibt den Klotzlook. Schon ein Viertel nimmt ihn weg, ohne die Form
 * zu veraendern: die Silhouette bleibt, aber die Kante faengt Licht. Genau
 * daran erkennt das Auge "geschliffen" statt "gewuerfelt".
 */
export let kantenbruch = 0;
export function setzeKantenbruch(wert: number): void {
  kantenbruch = wert;
}

/**
 * Wie die Kaesten zu Koerpern werden.
 *
 *  - klotz: ein Quader je Kasten, gegebenenfalls mit gebrochener Kante.
 *  - glatt: eine gemeinsame Huelle ueber alle Kaesten eines Teils.
 *
 * Die Modelldaten sind in beiden Faellen dieselben.
 */
export type Bauform = 'klotz' | 'glatt';
export let bauform: Bauform = 'klotz';
export function setzeBauform(wert: Bauform): void {
  bauform = wert;
}

function kastenGeometrie(kasten: RohKasten): THREE.BufferGeometry {
  const [sx, sy, sz] = kasten.size;
  const b = sx * VOXEL;
  const h = sy * VOXEL;
  const t = sz * VOXEL;
  const radius = Math.min(b, h, t) * kantenbruch;
  const geometrie: THREE.BufferGeometry =
    radius > 0.0005
      ? new RoundedBoxGeometry(b, h, t, 1, radius)
      : new THREE.BoxGeometry(b, h, t);
  geometrie.translate(kasten.pos[0] * VOXEL, kasten.pos[1] * VOXEL, kasten.pos[2] * VOXEL);

  farbe.set(kasten.color);
  const f = streuung(kasten.pos[0], kasten.pos[1], kasten.pos[2], kasten.grain ?? 0.12);
  const anzahl = geometrie.attributes['position']?.count ?? 0;
  const farben = new Float32Array(anzahl * 3);
  for (let i = 0; i < anzahl; i++) {
    farben[i * 3] = farbe.r * f;
    farben[i * 3 + 1] = farbe.g * f;
    farben[i * 3 + 2] = farbe.b * f;
  }
  geometrie.setAttribute('color', new THREE.BufferAttribute(farben, 3));
  return geometrie;
}

/**
 * Verschmelzen mit Fehlermeldung statt null.
 *
 * mergeGeometries gibt null zurueck, wenn die Eingaben nicht zusammenpassen,
 * und schreibt nur eine Konsolenzeile. Wandert das null in ein THREE.Mesh,
 * stirbt der Renderer viel spaeter an einer Stelle, die nichts damit zu tun
 * hat. Deshalb faellt es hier auf, mit den Angaben, die den Fall erklaeren.
 */
export function verschmelze(
  was: string,
  geometrien: readonly THREE.BufferGeometry[],
): THREE.BufferGeometry {
  // Ohne Texturen braucht niemand die uv-Koordinaten, und ohne sie passen
  // Quader und geschliffene Huellen zusammen. mergeGeometries verlangt
  // ausserdem, dass entweder alle oder keine Geometrie einen Index hat.
  for (const g of geometrien) {
    g.deleteAttribute('uv');
    // Quader haben keine gebackene Abschattung. Damit sie sich trotzdem mit
    // geschliffenen Huellen verschmelzen lassen, bekommen sie den neutralen
    // Wert - sonst faellt mergeGeometries wieder auf null zurueck.
    if (g.getAttribute('abschattung') === undefined) {
      const anzahl = g.attributes['position']?.count ?? 0;
      g.setAttribute('abschattung', new THREE.BufferAttribute(new Float32Array(anzahl).fill(1), 1));
    }
  }
  const alleIndiziert = geometrien.every((g) => g.index !== null);
  const gleich = alleIndiziert
    ? (geometrien as THREE.BufferGeometry[])
    : geometrien.map((g) => (g.index === null ? g : g.toNonIndexed()));
  const gesamt = mergeGeometries(gleich, false);
  if (gesamt === null) {
    const arten = new Set(
      geometrien.map(
        (g) => `${g.index === null ? 'ohne' : 'mit'} Index [${Object.keys(g.attributes).sort().join(',')}]`,
      ),
    );
    throw new Error(
      `${was}: ${geometrien.length} Geometrien passen nicht zusammen: ${[...arten].join(' / ')}`,
    );
  }
  return gesamt;
}

function zusammen(kaesten: readonly RohKasten[]): THREE.BufferGeometry | null {
  if (kaesten.length === 0) return null;
  if (bauform === 'glatt') return baueHuelle(kaesten);
  const teile = kaesten.map(kastenGeometrie);
  const gesamt = verschmelze('Modellteil', teile);
  for (const t of teile) t.dispose();
  return gesamt;
}

export function baueModell(modell: RohModell): ModellBau {
  let hoehe = 0;
  const teile: TeilBau[] = modell.parts.map((teil) => {
    for (const k of teil.boxes) hoehe = Math.max(hoehe, (k.pos[1] + k.size[1] / 2) * VOXEL);
    return {
      name: teil.name,
      fest: zusammen(teil.boxes.filter((k) => (k.glow ?? 0) <= 0)),
      leuchtend: zusammen(teil.boxes.filter((k) => (k.glow ?? 0) > 0)),
      pivot: new THREE.Vector3(
        teil.pivot[0] * VOXEL,
        teil.pivot[1] * VOXEL,
        teil.pivot[2] * VOXEL,
      ),
      swing: teil.swing,
      bob: teil.bob,
    };
  });
  return { id: modell.id, teile, hover: (modell.hover ?? 0) * VOXEL, hoehe };
}

/** Ein aufgebautes Modell als Gruppe, mit den Teilen als drehbare Kinder. */
export function alsGruppe(
  bau: ModellBau,
  materialien: { fest: THREE.Material; leuchtend: THREE.Material },
): { gruppe: THREE.Group; teile: THREE.Object3D[] } {
  const gruppe = new THREE.Group();
  const teile: THREE.Object3D[] = [];
  for (const teil of bau.teile) {
    const knoten = new THREE.Group();
    if (teil.fest !== null) {
      const netz = new THREE.Mesh(teil.fest, materialien.fest);
      netz.castShadow = true;
      netz.receiveShadow = true;
      knoten.add(netz);
    }
    if (teil.leuchtend !== null) {
      knoten.add(new THREE.Mesh(teil.leuchtend, materialien.leuchtend));
    }
    knoten.userData['teil'] = teil;
    gruppe.add(knoten);
    teile.push(knoten);
  }
  return { gruppe, teile };
}

/**
 * Wendet Pendeln und Wippen auf die Teile an. Zeit in Sekunden.
 *
 * Der Schutz gegen ungueltige Zahlen ist nicht uebervorsichtig, sondern
 * teuer bezahlt: ein einziges NaN in der Drehung macht die ganze
 * Transformationsmatrix ungueltig, und die Geometrie verschwindet dann
 * spurlos - ohne Fehler, ohne Warnung, ohne dass die Zahl der
 * Zeichenbefehle sinkt. Die Ursache war ein Feldname, den es nicht gab.
 */
export function bewege(teile: readonly THREE.Object3D[], zeit: number, tempo: number): void {
  if (!Number.isFinite(zeit) || !Number.isFinite(tempo)) return;
  for (const knoten of teile) {
    const teil = knoten.userData['teil'] as TeilBau | undefined;
    if (teil === undefined) continue;
    if (teil.swing !== undefined) {
      const winkel = Math.sin(zeit * tempo + teil.swing.phase) * teil.swing.amp;
      knoten.rotation.set(0, 0, 0);
      knoten.rotation[teil.swing.axis] = winkel;
      // Um den Drehpunkt statt um den Ursprung drehen.
      knoten.position.copy(teil.pivot);
      knoten.children.forEach((kind) => kind.position.copy(teil.pivot).negate());
    } else if (teil.bob !== undefined) {
      knoten.position.y = Math.sin(zeit * tempo + teil.bob.phase) * teil.bob.amp * VOXEL;
    }
  }
}
