/**
 * Weiche Schattenflecken unter allem, was auf dem Boden steht.
 *
 * Ein gerichteter Schatten sagt, wo die Sonne steht. Er sagt nicht, dass ein
 * Koerper den Boden beruehrt - dafuer sitzt er an der falschen Stelle. Genau
 * dieser Fleck direkt unter der Figur ist es aber, den das Auge als "steht
 * auf" liest. Fehlt er, schwebt alles, und keine noch so gute Beleuchtung
 * bekommt das wieder hin.
 *
 * Gerechnet wird nichts: ein Farbverlauf auf einer Scheibe, alle Scheiben in
 * einem einzigen Zeichenbefehl. Das laeuft auf jedem Telefon.
 */

import * as THREE from 'three';

function scheibenBild(): THREE.CanvasTexture {
  const grosse = 128;
  const blatt = document.createElement('canvas');
  blatt.width = grosse;
  blatt.height = grosse;
  const stift = blatt.getContext('2d');
  if (stift === null) throw new Error('Kein 2D-Zeichenbereich.');
  const verlauf = stift.createRadialGradient(
    grosse / 2, grosse / 2, 0,
    grosse / 2, grosse / 2, grosse / 2,
  );
  // Innen fast deckend, nach aussen weich auslaufend. Der Knick bei 0.45
  // gibt dem Fleck einen Kern - ohne ihn sieht er nach Nebel aus.
  verlauf.addColorStop(0, 'rgba(0,0,0,0.95)');
  verlauf.addColorStop(0.45, 'rgba(0,0,0,0.55)');
  verlauf.addColorStop(1, 'rgba(0,0,0,0)');
  stift.fillStyle = verlauf;
  stift.fillRect(0, 0, grosse, grosse);
  const bild = new THREE.CanvasTexture(blatt);
  bild.colorSpace = THREE.SRGBColorSpace;
  return bild;
}

export interface Bodenschatten {
  readonly netz: THREE.InstancedMesh;
  /** Setzt einen Fleck. Der Index laeuft von null hoch. */
  readonly setze: (index: number, x: number, y: number, z: number, breite: number) => void;
  /** Wie viele Flecken gezeichnet werden. */
  readonly zeige: (anzahl: number) => void;
  readonly material: THREE.MeshBasicMaterial;
}

export function baueBodenschatten(hoechstens: number): Bodenschatten {
  const material = new THREE.MeshBasicMaterial({
    map: scheibenBild(),
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
    color: 0x0a0d12,
  });
  const scheibe = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const netz = new THREE.InstancedMesh(scheibe, material, hoechstens);
  netz.frustumCulled = false;
  netz.renderOrder = 2;
  netz.count = 0;
  // Die Flecken sind flach und liegen auf dem Boden; Schatten auf sie zu
  // werfen oder von ihnen werfen zu lassen waere beides falsch.
  netz.castShadow = false;
  netz.receiveShadow = false;

  const hilfe = new THREE.Object3D();
  return {
    netz,
    material,
    setze: (index, x, y, z, breite): void => {
      if (index >= hoechstens) return;
      hilfe.position.set(x, y, z);
      hilfe.scale.set(breite, 1, breite);
      hilfe.updateMatrix();
      netz.setMatrixAt(index, hilfe.matrix);
    },
    zeige: (anzahl): void => {
      netz.count = Math.min(anzahl, hoechstens);
      netz.instanceMatrix.needsUpdate = true;
    },
  };
}
