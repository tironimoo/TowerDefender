/**
 * Die Werkstatt: vier Modelle nebeneinander auf einem Drehteller.
 *
 * Sie beantwortet die Frage, die der Diorama-Prototyp offen laesst. Dort
 * steckt der Stil in hundert Dingen gleichzeitig - Licht, Nachbearbeitung,
 * Karte, Kamera - und laesst sich deshalb nicht zuordnen. Hier ist alles
 * gleich ausser dem einen: links Modelle aus Quadern, rechts dieselben
 * Motive aus Eiern und Wuersten.
 *
 * Wenn der Minecraft-Eindruck links bleibt und rechts verschwindet, liegt er
 * an den Modellen und nicht an der Darstellung. Dann hilft kein Schattierer,
 * sondern nur neue Modelle.
 */

import * as THREE from 'three';

import type { ModellBau, RohModell } from '@render3d/meshbau';
import { alsGruppe, baueModell, bewege, setzeBauform } from '@render3d/meshbau';
import { setzeVerschmelzung } from '@render3d/glatt';
import { knetWerte, machKnete } from '@render3d/knete';
import { baueHimmel } from '@render3d/himmel';
import { baueBodenschatten } from '@render3d/bodenschatten';
import { KNETMODELLE } from '@render3d/knetmodelle';

const gefunden = document.getElementById('buehne');
if (gefunden === null) throw new Error('Buehne fehlt.');
const wurzel: HTMLElement = gefunden;

setzeBauform('glatt');
setzeVerschmelzung(0.55);
knetWerte.korn.value = 0.55;
knetWerte.beulen.value = 0.45;
knetWerte.rand.value = 0.3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
wurzel.appendChild(renderer.domElement);

const szene = new THREE.Scene();
const himmel = baueHimmel(60);
himmel.setze('#6d89a8', '#c2a883', '#e8d5b4');
szene.add(himmel.netz);

const kamera = new THREE.PerspectiveCamera(30, 1, 0.5, 120);

const sonne = new THREE.DirectionalLight('#fff2dc', 3.1);
sonne.position.set(-6, 11, 9);
sonne.castShadow = true;
sonne.shadow.camera.left = -6;
sonne.shadow.camera.right = 6;
sonne.shadow.camera.top = 6;
sonne.shadow.camera.bottom = -6;
sonne.shadow.camera.far = 40;
sonne.shadow.mapSize.set(2048, 2048);
sonne.shadow.bias = -0.0012;
sonne.shadow.normalBias = 0.02;
szene.add(sonne);
szene.add(new THREE.DirectionalLight('#9dc4ee', 1.5).translateX(9).translateY(5).translateZ(-8));
szene.add(new THREE.HemisphereLight('#cfe2f5', '#8a7256', 2.6));

const materialien = {
  fest: machKnete(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.55,
    }),
  ),
  leuchtend: new THREE.MeshBasicMaterial({ vertexColors: true }),
};

// Ein Tisch statt einer Landschaft: hier geht es um die Figuren.
const tisch = new THREE.Mesh(
  new THREE.CylinderGeometry(7.5, 7.2, 0.5, 48),
  new THREE.MeshPhysicalMaterial({ color: '#b9a488', roughness: 0.85, metalness: 0 }),
);
tisch.position.y = -0.25;
tisch.receiveShadow = true;
szene.add(tisch);

const schatten = baueBodenschatten(8);
schatten.material.opacity = 0.45;
szene.add(schatten.netz);

const antwort = await fetch(new URL('../modelle/modelle.json', import.meta.url));
const roh = (await antwort.json()) as { modelle: Record<string, RohModell> };

function hole(id: string): RohModell {
  const m = roh.modelle[id];
  if (m === undefined) throw new Error(`Modell ${id} fehlt.`);
  return m;
}

function knet(id: string): RohModell {
  const m = KNETMODELLE.get(id);
  if (m === undefined) throw new Error(`Knetmodell ${id} fehlt.`);
  return m;
}

const reihe: readonly { modell: RohModell; x: number; tempo: number }[] = [
  { modell: hole('prop_baum'), x: -4.2, tempo: 1.1 },
  { modell: hole('moderling'), x: -1.4, tempo: 5.5 },
  { modell: knet('prop_baum'), x: 1.4, tempo: 1.1 },
  { modell: knet('moderling'), x: 4.2, tempo: 5.5 },
];

interface Stueck {
  readonly gruppe: THREE.Group;
  readonly teile: THREE.Object3D[];
  readonly tempo: number;
}
const stuecke: Stueck[] = [];

reihe.forEach((eintrag, index) => {
  const bau: ModellBau = baueModell(eintrag.modell);
  const { gruppe, teile } = alsGruppe(bau, materialien);
  gruppe.position.set(eintrag.x, 0, 0);
  szene.add(gruppe);
  stuecke.push({ gruppe, teile, tempo: eintrag.tempo });
  schatten.setze(index, eintrag.x, 0.02, 0, 0.9 + bau.hoehe * 0.45);
});
schatten.zeige(reihe.length);

function passeGroesseAn(): void {
  const b = wurzel.clientWidth;
  const h = wurzel.clientHeight;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(b, h, false);
  kamera.aspect = b / h;
  // Auf einem hochkanten Schirm muss die Kamera weiter weg, sonst stehen die
  // vier Figuren nebeneinander ausserhalb des Bildes.
  const abstand = 13 + Math.max(0, 1.6 - kamera.aspect) * 9;
  kamera.position.set(0, 3.4, abstand);
  kamera.lookAt(0, 1.3, 0);
  kamera.updateProjectionMatrix();
}
window.addEventListener('resize', passeGroesseAn);
passeGroesseAn();

let ziehtAb = 0;
let ziehen = false;
renderer.domElement.addEventListener('pointerdown', () => { ziehen = true; });
renderer.domElement.addEventListener('pointerup', () => { ziehen = false; });
renderer.domElement.addEventListener('pointerleave', () => { ziehen = false; });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!ziehen) return;
  ziehtAb -= e.movementX * 0.006;
});

// In der Werkstatt darf der Knetfilmtakt bleiben: hier greift niemand ein,
// und beim reinen Zuschauen wirkt er richtig.
const TAKT = 12;
let letzterTakt = -1;
function bild(): void {
  requestAnimationFrame(bild);
  const takt = Math.floor((performance.now() / 1000) * TAKT);
  if (takt !== letzterTakt) {
    letzterTakt = takt;
    const zeit = takt / TAKT;
    // Jedes Stueck dreht sich um sich selbst statt der Tisch: so bleibt die
    // Beschriftung unter der richtigen Figur stehen.
    for (const stueck of stuecke) {
      stueck.gruppe.rotation.y = ziehtAb + zeit * 0.3;
      bewege(stueck.teile, zeit, stueck.tempo);
    }
  }
  renderer.render(szene, kamera);
}
bild();
