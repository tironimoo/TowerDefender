/**
 * Baut die Karte als schwebende Miniaturinsel.
 *
 * Alles Unbewegliche - Boden, Weg, Wasser, Felsen, Baeume, der Sockel - wird
 * zu wenigen grossen Geometrien zusammengefasst. Eine Karte mit 240 Kacheln
 * und 40 Requisiten kostet danach eine Handvoll Zeichenbefehle statt
 * dreihundert. Das ist der Unterschied zwischen fluessig und ruckelnd auf
 * einem Handy.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { LevelDef, Region, TileKind } from "@sim/index";
import type { ModellBau } from "./meshbau";
import { kantenbruch, verschmelze, VOXEL } from "./meshbau";
import { baueBoden } from "./boden";

/** Farben je Region. Bewusst wenige und eng beieinander. */
interface RegionFarben {
  readonly boden: readonly [string, string];
  readonly weg: string;
  readonly fluessig: string;
  readonly fluessigLeuchtet: number;
  readonly sockel: string;
  readonly himmel: string;
  readonly licht: string;
  readonly fuellicht: string;
  readonly nebel: string;
}

export const REGIONEN: Readonly<Record<Region, RegionFarben>> = {
  wald: {
    boden: ["#4a7c3f", "#436f3a"],
    weg: "#6b5136",
    fluessig: "#2f6f9e",
    fluessigLeuchtet: 0.15,
    sockel: "#3a2f26",
    himmel: "#0a1410",
    licht: "#ffe0b0",
    fuellicht: "#3a5a7a",
    nebel: "#0d1a14",
  },
  glut: {
    boden: ["#4a3a38", "#413230"],
    weg: "#2e2422",
    fluessig: "#ff6a1e",
    fluessigLeuchtet: 2.4,
    sockel: "#241a18",
    himmel: "#140806",
    licht: "#ffb070",
    fuellicht: "#8a3a1a",
    nebel: "#1a0a06",
  },
  leere: {
    boden: ["#4a3f7a", "#413670"],
    weg: "#6a5a94",
    fluessig: "#a86adf",
    fluessigLeuchtet: 1.1,
    sockel: "#1e1834",
    himmel: "#08060f",
    licht: "#c8b0ff",
    fuellicht: "#4a3a8a",
    nebel: "#0c0818",
  },
};

/** Kachelhoehen in Weltmass. Der Weg liegt tiefer, damit er sich abzeichnet. */
const HOEHE: Readonly<Record<TileKind, number>> = {
  boden: 0.16,
  weg: 0.1,
  fluessig: 0.06,
  fels: 0.22,
  leer: 0,
};

const farbe = new THREE.Color();

/** Kachel oder Platte, mit demselben Kantenbruch wie die Modelle. */
function kastenMitKante(b: number, h: number, t: number): THREE.BufferGeometry {
  const radius = Math.min(b, h, t) * kantenbruch;
  return radius > 0.0005
    ? new RoundedBoxGeometry(b, h, t, 1, radius)
    : new THREE.BoxGeometry(b, h, t);
}

function gefaerbt(
  geometrie: THREE.BufferGeometry,
  ton: string,
  streuung: number,
): THREE.BufferGeometry {
  farbe.set(ton);
  const f = 1 + (Math.random() - 0.5) * streuung;
  const anzahl = geometrie.attributes["position"]?.count ?? 0;
  const farben = new Float32Array(anzahl * 3);
  for (let i = 0; i < anzahl; i++) {
    farben[i * 3] = farbe.r * f;
    farben[i * 3 + 1] = farbe.g * f;
    farben[i * 3 + 2] = farbe.b * f;
  }
  geometrie.setAttribute("color", new THREE.BufferAttribute(farben, 3));
  return geometrie;
}

export interface InselTeile {
  readonly gruppe: THREE.Group;
  readonly mitte: THREE.Vector3;
  readonly ausdehnung: number;
  /**
   * Schaltet das Wasser zwischen durchsichtig und einfach um.
   * Null, wenn die Karte kein Wasser hat.
   */
  readonly wasser: ((tief: boolean) => void) | null;
}

export function baueInsel(
  level: LevelDef,
  modelle: ReadonlyMap<string, ModellBau>,
  materialien: { fest: THREE.Material; leuchtend: THREE.Material },
  glatterBoden = false,
): InselTeile {
  const farben = REGIONEN[level.region];
  const gruppe = new THREE.Group();

  const feste: THREE.BufferGeometry[] = [];
  const leuchtende: THREE.BufferGeometry[] = [];

  // --- Boden ---------------------------------------------------------------
  // Zwei Lesarten: als Hoehenfeld eine durchgehende Matte, oder wie bisher
  // ein Wuerfel je Kachel. Der Unterschied ist derselbe wie zwischen Ei und
  // Quader bei den Figuren - das Raster ist der Stil, nicht seine Aufteilung.
  let wasser: ((tief: boolean) => void) | null = null;
  if (glatterBoden) {
    const boden = baueBoden(level, {
      gras: farben.boden,
      weg: farben.weg,
      bett: farben.sockel,
      fels: farben.sockel,
      boeschung: farben.sockel,
    });
    feste.push(boden.flaeche);
    if (boden.wasser !== null) {
      const wasserNetz = new THREE.Mesh(
        boden.wasser,
        // Giessharz statt Farbe: stark spiegelnd, halb durchsichtig, und
        // die Farbe bewusst gebrochen. Reines Blau sieht nach Papier aus.
        new THREE.MeshPhysicalMaterial({
          color: farben.fluessig,
          roughness: 0.08,
          metalness: 0,
          transmission: 0.6,
          thickness: 0.35,
          ior: 1.33,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        }),
      );
      wasserNetz.renderOrder = 1;
      gruppe.add(wasserNetz);
      // Durchsichtiges Wasser kostet einen eigenen Durchgang je Bild. Auf
      // schwachen Geraeten wird daraus eine spiegelnde Flaeche ohne Tiefe -
      // das sieht immer noch nach Giessharz aus und kostet nichts.
      const material = wasserNetz.material;
      wasser = (tief: boolean): void => {
        material.transmission = tief ? 0.6 : 0;
        material.opacity = tief ? 0.8 : 0.92;
        material.roughness = tief ? 0.08 : 0.16;
        material.needsUpdate = true;
      };
    }
  }

  // --- Kacheln ------------------------------------------------------------
  const wegFelder = new Set(level.randWeg.map((f) => `${f.x},${f.y}`));
  for (let ty = 0; ty < level.hoehe && !glatterBoden; ty++) {
    for (let tx = 0; tx < level.breite; tx++) {
      const art = level.kacheln[ty * level.breite + tx] ?? "leer";
      if (art === "leer") continue;
      const h = HOEHE[art];
      const ton =
        art === "weg"
          ? farben.weg
          : art === "fluessig"
            ? farben.fluessig
            : art === "fels"
              ? farben.sockel
              : (farben.boden[(tx + ty) % 2] ?? farben.boden[0]);

      const kachel = kastenMitKante(1, h, 1);
      kachel.translate(tx + 0.5, h / 2, ty + 0.5);
      if (art === "fluessig" && farben.fluessigLeuchtet > 0.5) {
        leuchtende.push(gefaerbt(kachel, ton, 0.1));
      } else {
        feste.push(gefaerbt(kachel, ton, 0.07));
      }
    }
  }

  // Wegkacheln ausserhalb der Karte: Zugang und Ausgang.
  for (const feld of level.randWeg) {
    if (glatterBoden) break;
    if (!wegFelder.has(`${feld.x},${feld.y}`)) continue;
    const kachel = kastenMitKante(1, HOEHE.weg, 1);
    kachel.translate(feld.x + 0.5, HOEHE.weg / 2, feld.y + 0.5);
    feste.push(gefaerbt(kachel, farben.weg, 0.07));
  }

  // --- Sockel der Insel ---------------------------------------------------
  // Nach unten leicht verjuengt: das laesst die Insel schweben statt stehen.
  if (!glatterBoden) {
    const sockel = new THREE.CylinderGeometry(
      Math.max(level.breite, level.hoehe) * 0.52,
      Math.max(level.breite, level.hoehe) * 0.34,
      1.6,
      4,
      1,
    );
    const sockelFlach = sockel;
    sockelFlach.rotateY(Math.PI / 4);
    sockelFlach.scale(
      level.breite / Math.max(level.breite, level.hoehe),
      1,
      level.hoehe / Math.max(level.breite, level.hoehe),
    );
    sockelFlach.translate(level.breite / 2, -0.8, level.hoehe / 2);
    feste.push(gefaerbt(sockelFlach, farben.sockel, 0.05));
  }

  // --- Requisiten ---------------------------------------------------------
  for (const prop of level.props) {
    const bau = modelle.get(prop.model);
    if (bau === undefined) continue;
    for (const teil of bau.teile) {
      for (const [geo, ziel] of [
        [teil.fest, feste],
        [teil.leuchtend, leuchtende],
      ] as const) {
        if (geo === null) continue;
        const kopie = geo.clone();
        kopie.rotateY((prop.dir * Math.PI) / 4);
        kopie.translate(prop.x, HOEHE.boden, prop.y);
        ziel.push(kopie);
      }
    }
  }

  // --- Bauplaetze ---------------------------------------------------------
  for (const slot of level.buildSlots) {
    if (slot.aufWeg) continue;
    // Runde Platten statt eckiger: ein Quadrat im Gras ruft das Raster
    // sofort wieder auf, ein Kreis nicht.
    const platte = glatterBoden
      ? new THREE.CylinderGeometry(0.42, 0.45, 0.07, 18)
      : kastenMitKante(0.74, 0.06, 0.74);
    platte.translate(slot.x, HOEHE.boden + 0.035, slot.y);
    feste.push(gefaerbt(platte, "#a39d8e", 0.05));
  }

  if (feste.length > 0) {
    const netz = new THREE.Mesh(
      verschmelze("Insel fest", feste),
      materialien.fest,
    );
    netz.castShadow = true;
    netz.receiveShadow = true;
    gruppe.add(netz);
  }
  if (leuchtende.length > 0) {
    gruppe.add(
      new THREE.Mesh(
        verschmelze("Insel leuchtend", leuchtende),
        materialien.leuchtend,
      ),
    );
  }
  for (const g of [...feste, ...leuchtende]) g.dispose();

  return {
    gruppe,
    mitte: new THREE.Vector3(level.breite / 2, 0, level.hoehe / 2),
    ausdehnung: Math.max(level.breite, level.hoehe),
    wasser,
  };
}

export { HOEHE, VOXEL };
