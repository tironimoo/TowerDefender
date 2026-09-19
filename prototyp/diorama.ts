/**
 * Prototyp: Karte eins als leuchtendes Diorama.
 *
 * Zweck ist eine Entscheidung, kein fertiges Spiel. Die Frage lautet: sieht
 * dieser Stil gut genug aus, um den Umbau zu rechtfertigen, und laeuft er auf
 * einem Handy fluessig? Deshalb laeuft dahinter die *echte* Simulation aus
 * src/sim - gemessen wird sonst eine Last, die es im Spiel nicht gibt.
 *
 * Die Simulation wird dabei mit keiner Zeile angefasst. Genau dafuer ist sie
 * von der Darstellung getrennt.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { loadContent } from '@data/index';
import type { Enemy, World } from '@sim/index';
import { applyCommand, createWorld, step, TICKS_PER_SECOND } from '@sim/index';

import type { ModellBau, RohModell } from './meshbau';
import { alsGruppe, bauform, baueModell, bewege, setzeBauform, setzeKantenbruch, VOXEL } from './meshbau';
import { setzeVerschmelzung } from './glatt';
import { baueInsel, HOEHE, REGIONEN } from './welt3d';
import { TiltShiftShader } from './tiltshift';

const LEVEL = 'level-01';

// --- Qualitaetsstufen ------------------------------------------------------
// Was ein Handy nicht schafft, wird weggelassen statt langsam gerechnet.
interface Stufe {
  readonly name: string;
  readonly schatten: number;
  readonly bluehen: boolean;
  readonly tiltShift: boolean;
  readonly aufloesung: number;
}
const STUFEN: readonly Stufe[] = [
  { name: 'Hoch', schatten: 2048, bluehen: true, tiltShift: true, aufloesung: 2 },
  { name: 'Mittel', schatten: 1024, bluehen: true, tiltShift: false, aufloesung: 1.5 },
  { name: 'Sparsam', schatten: 0, bluehen: false, tiltShift: false, aufloesung: 1 },
];

const gefunden = document.getElementById('buehne');
if (gefunden === null) throw new Error('Buehne fehlt.');
const wurzel: HTMLElement = gefunden;
const anzeige = document.getElementById('anzeige');

const content = loadContent();
const level = content.levels.get(LEVEL);
if (level === undefined) throw new Error(`Karte ${LEVEL} fehlt.`);
const farben = REGIONEN[level.region];

// --- Renderer und Szene ----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
// Ohne das setzt jeder Renderdurchgang den Zaehler selbst zurueck, und die
// Nachbearbeitung besteht aus mehreren - abzulesen waere dann nur der letzte,
// ein Vollbild-Viereck.
renderer.info.autoReset = false;
wurzel.appendChild(renderer.domElement);

const szene = new THREE.Scene();
szene.background = new THREE.Color(farben.himmel);
// Nebel erst weit hinten: er soll den Rand der Insel weich machen, nicht die
// Insel selbst schlucken.
szene.fog = new THREE.Fog(farben.nebel, 30, 85);

const kamera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);

// Hauptlicht von schraeg hinten: lange Schatten ueber die Karte, das gibt
// der flachen Insel ueberhaupt erst ein Relief.
const sonne = new THREE.DirectionalLight(farben.licht, 3.0);
sonne.position.set(-14, 20, -10);
sonne.castShadow = true;
sonne.shadow.camera.left = -18;
sonne.shadow.camera.right = 18;
sonne.shadow.camera.top = 18;
sonne.shadow.camera.bottom = -18;
sonne.shadow.camera.far = 60;
sonne.shadow.bias = -0.0015;
szene.add(sonne);
// Fuelllicht von oben und unten. Ohne das versinkt alles, was im Schatten der
// Sonne liegt, in Schwarz - und dunkle Gegner auf dunklem Weg sieht dann
// niemand mehr.
szene.add(new THREE.HemisphereLight(farben.fuellicht, farben.sockel, 2.2));
// Gegenlicht von der anderen Seite: zeichnet Kanten nach und loest die
// Figuren vom Hintergrund.
const gegenlicht = new THREE.DirectionalLight(farben.fuellicht, 1.1);
gegenlicht.position.set(16, 9, 14);
szene.add(gegenlicht);

// MeshStandardMaterial statt Lambert: erst ein Glanzlicht macht aus einer
// Flaeche ein Material. Matt und leicht rau - poliert wuerde nach Plastik
// aussehen, und darum geht es hier gerade nicht.
const materialFest = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.06,
});
const materialLeuchtend = new THREE.MeshBasicMaterial({ vertexColors: true });
const materialien = { fest: materialFest, leuchtend: materialLeuchtend };

// Gegner bekommen ein eigenes Material mit etwas Eigenleuchten. Nicht aus
// Effekthascherei: nachts auf dunklem Weg verschwinden dunkle Figuren sonst
// im Untergrund, und ein Gegner, den man nicht sieht, ist ein Fehler im
// Spiel und nicht im Bild.
const materialienGegner = {
  fest: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.05,
    emissive: new THREE.Color(0x2a3a4a),
    emissiveIntensity: 0.9,
  }),
  leuchtend: materialLeuchtend,
};

// --- Modelle laden ---------------------------------------------------------
// Drei Lesarten derselben Modelldaten, zum Vergleichen nebeneinander:
//   ?form=klotz&kante=0    der reine Wuerfellook
//   ?form=klotz&kante=0.3  Quader mit gebrochener Kante
//   ?form=glatt            eine geschliffene Huelle je Koerperteil
const parameter = new URLSearchParams(location.search);
const kante = Number(parameter.get('kante') ?? '0.28');
setzeKantenbruch(Number.isFinite(kante) ? Math.max(0, Math.min(0.49, kante)) : 0.28);
setzeBauform(parameter.get('form') === 'klotz' ? 'klotz' : 'glatt');
const weichheit = Number(parameter.get('weich') ?? '0.5');
if (Number.isFinite(weichheit)) setzeVerschmelzung(Math.max(0, Math.min(3, weichheit)));

const antwort = await fetch(new URL('../modelle/modelle.json', import.meta.url));
if (!antwort.ok) {
  // Ohne Modelle wuerde hier eine leere Insel stehen, ohne dass jemand weiss,
  // warum. Das ist genau einmal passiert, und die Suche danach war laestig.
  if (anzeige !== null) {
    anzeige.textContent = 'modelle.json fehlt - npm run modelle ausfuehren';
  }
  throw new Error(`modelle.json nicht geladen: HTTP ${antwort.status}`);
}
const roh = (await antwort.json()) as { modelle: Record<string, RohModell> };
const modelle = new Map<string, ModellBau>();
for (const [id, m] of Object.entries(roh.modelle)) modelle.set(id, baueModell(m));

// --- Insel -----------------------------------------------------------------
const insel = baueInsel(level, modelle, materialien);
szene.add(insel.gruppe);

// Sternenstaub, damit die Insel nicht im Nichts klebt.
const staubZahl = 400;
const staubOrte = new Float32Array(staubZahl * 3);
for (let i = 0; i < staubZahl; i++) {
  staubOrte[i * 3] = insel.mitte.x + (Math.random() - 0.5) * 70;
  staubOrte[i * 3 + 1] = (Math.random() - 0.4) * 40;
  staubOrte[i * 3 + 2] = insel.mitte.z + (Math.random() - 0.5) * 70;
}
const staub = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(staubOrte, 3)),
  new THREE.PointsMaterial({ color: farben.licht, size: 0.06, transparent: true, opacity: 0.5 }),
);
szene.add(staub);

// --- Simulation ------------------------------------------------------------
const world: World = createWorld({ content, levelId: LEVEL, difficulty: 'hart', seed: 4 });
world.gold = 100000;
world.lives = 9999;

// Nur jeder dritte Platz wird bebaut, und die Gegner sind auf Albtraum
// unterwegs. Mit einer dichten Reihe voll ausgebauter Tuerme sterben sie am
// Eingang, und der Weg - das eigentliche Schaustueck - bliebe leer.
let n = 0;
for (let i = 0; i < world.level.buildSlots.length; i++) {
  if (world.level.buildSlots[i]?.aufWeg !== false) continue;
  n++;
  if (n % 3 !== 0) continue;
  applyCommand(world, {
    type: 'bauen',
    slotIndex: i,
    towerDefId: n % 2 === 0 ? 'armbrustturm' : 'schleuder',
  });
}
// Voll ausgebaut, damit Fahnen, Kranz und Leuchtsteine zu sehen sind - das
// ist der sichtbarste Unterschied zwischen den Ausbaustufen.
for (const turm of world.towers.items) {
  if (!turm.active) continue;
  for (let s = 0; s < 3; s++) applyCommand(world, { type: 'ausbauen', towerId: turm.id });
}

// --- Tuerme aufstellen -----------------------------------------------------
interface Aufbau {
  readonly gruppe: THREE.Group;
  readonly teile: THREE.Object3D[];
}
const turmBilder = new Map<number, Aufbau>();
for (const turm of world.towers.items) {
  if (!turm.active) continue;
  const bau = modelle.get(`${turm.defId}_s${turm.level}`) ?? modelle.get(turm.defId);
  if (bau === undefined) continue;
  const { gruppe, teile } = alsGruppe(bau, materialien);
  gruppe.position.set(turm.x, HOEHE.boden, turm.y);
  szene.add(gruppe);
  turmBilder.set(turm.id, { gruppe, teile });
}

// --- Gegner und Geschosse --------------------------------------------------
const gegnerBilder = new Map<number, Aufbau>();
const geschossBilder = new Map<number, THREE.Object3D>();

function gegnerBild(enemy: Enemy): Aufbau | null {
  const vorhanden = gegnerBilder.get(enemy.id);
  if (vorhanden !== undefined) return vorhanden;
  const bau = modelle.get(enemy.defId);
  if (bau === undefined) return null;
  const { gruppe, teile } = alsGruppe(bau, materialienGegner);
  szene.add(gruppe);
  const bild = { gruppe, teile };
  gegnerBilder.set(enemy.id, bild);
  return bild;
}

// --- Kamera ----------------------------------------------------------------
let drehung = Math.PI * 0.25;
let neigung = 0.62;
let abstand = insel.ausdehnung * 1.5;
const blick = insel.mitte.clone();

function setzeKamera(): void {
  kamera.position.set(
    blick.x + Math.cos(drehung) * Math.cos(neigung) * abstand,
    blick.y + Math.sin(neigung) * abstand,
    blick.z + Math.sin(drehung) * Math.cos(neigung) * abstand,
  );
  kamera.lookAt(blick);
  sonne.target.position.copy(blick);
  sonne.target.updateMatrixWorld();
}
szene.add(sonne.target);

// --- Nachbearbeitung -------------------------------------------------------
let stufe: Stufe = STUFEN[0] as Stufe;
const komponist = new EffectComposer(renderer);
const renderDurchgang = new RenderPass(szene, kamera);
const bluehen = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.55, 0.22);
// Drei Pixel Unschaerfe sieht niemand. Der Unterschied zwischen "Hoch" und
// "Mittel" war deshalb unsichtbar - und damit war die Stufe wertlos.
const tiltWaagerecht = new ShaderPass(TiltShiftShader);
const tiltSenkrecht = new ShaderPass(TiltShiftShader);
const senkrechtWert = tiltSenkrecht.uniforms['senkrecht'];
if (senkrechtWert !== undefined) senkrechtWert.value = 1;
const ausgabe = new OutputPass();

function baueKette(): void {
  komponist.passes.length = 0;
  komponist.addPass(renderDurchgang);
  if (stufe.bluehen) komponist.addPass(bluehen);
  if (stufe.tiltShift) {
    komponist.addPass(tiltWaagerecht);
    komponist.addPass(tiltSenkrecht);
  }
  komponist.addPass(ausgabe);
}

function setzeStufe(neu: Stufe): void {
  stufe = neu;
  renderer.shadowMap.enabled = neu.schatten > 0;
  sonne.castShadow = neu.schatten > 0;
  if (neu.schatten > 0) {
    sonne.shadow.mapSize.set(neu.schatten, neu.schatten);
    sonne.shadow.map?.dispose();
    sonne.shadow.map = null;
  }
  baueKette();
  passeGroesseAn();
}

function passeGroesseAn(): void {
  const b = wurzel.clientWidth;
  const h = wurzel.clientHeight;
  const dpr = Math.min(stufe.aufloesung, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setSize(b, h, false);
  komponist.setPixelRatio(dpr);
  komponist.setSize(b, h);
  kamera.aspect = b / h;
  kamera.updateProjectionMatrix();
  bluehen.resolution.set(b, h);
  for (const p of [tiltWaagerecht, tiltSenkrecht]) {
    const feld = p.uniforms['aufloesung'] as { value: THREE.Vector2 } | undefined;
    feld?.value.set(b * dpr, h * dpr);
  }
}
window.addEventListener('resize', passeGroesseAn);
setzeStufe(STUFEN[0] as Stufe);
setzeKamera();

// --- Bedienung -------------------------------------------------------------
const zeiger = new Map<number, { x: number; y: number }>();
let letzterAbstand = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  renderer.domElement.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const alt = zeiger.get(e.pointerId);
  if (alt === undefined) return;
  zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (zeiger.size === 1) {
    drehung -= (e.clientX - alt.x) * 0.006;
    neigung = Math.max(0.18, Math.min(1.35, neigung + (e.clientY - alt.y) * 0.005));
  } else if (zeiger.size === 2) {
    const [a, b] = [...zeiger.values()];
    if (a === undefined || b === undefined) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (letzterAbstand > 0) {
      abstand = Math.max(8, Math.min(60, abstand * (letzterAbstand / d)));
    }
    letzterAbstand = d;
  }
  setzeKamera();
});
for (const art of ['pointerup', 'pointercancel', 'pointerleave']) {
  renderer.domElement.addEventListener(art, (e) => {
    zeiger.delete((e as PointerEvent).pointerId);
    if (zeiger.size < 2) letzterAbstand = 0;
  });
}
renderer.domElement.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    abstand = Math.max(8, Math.min(60, abstand * (1 + Math.sign(e.deltaY) * 0.1)));
    setzeKamera();
  },
  { passive: false },
);

document.getElementById('stufe')?.addEventListener('click', () => {
  const index = (STUFEN.indexOf(stufe) + 1) % STUFEN.length;
  setzeStufe(STUFEN[index] as Stufe);
});
// Die Bauform steckt in den Modellen, die beim Laden entstehen. Statt alles
// im Betrieb neu aufzubauen, laedt die Taste die Seite mit der anderen Form -
// im Prototyp der ehrlichere Weg, weil nichts halb umgestellt sein kann.
document.getElementById('form')?.addEventListener('click', () => {
  const naechste = new URLSearchParams(location.search);
  naechste.set('form', bauform === 'glatt' ? 'klotz' : 'glatt');
  location.search = naechste.toString();
});
let drehenAn = true;
document.getElementById('drehen')?.addEventListener('click', () => {
  drehenAn = !drehenAn;
});

// --- Schleife --------------------------------------------------------------
let letzte = performance.now();
let ansammlung = 0;
let bilder = 0;
let fensterStart = performance.now();
let fps = 0;
const SCHRITT = 1000 / TICKS_PER_SECOND;

function bild(): void {
  requestAnimationFrame(bild);
  const jetzt = performance.now();
  const dt = Math.min(100, jetzt - letzte);
  letzte = jetzt;

  // Simulation mit festem Zeitschritt, hoechstens fuenf Schritte nachholen.
  ansammlung += dt;
  let schritte = 0;
  while (ansammlung >= SCHRITT && schritte < 5) {
    step(world);
    ansammlung -= SCHRITT;
    schritte++;
  }
  // Nachschub, solange wenig los ist - aber nicht so viel, dass der Weg zur
  // Warteschlange wird. Zwanzig bis dreissig Gegner sind das, was im Spiel
  // auf einer spaeten Welle wirklich unterwegs ist.
  if (world.wavesStarted < world.waveCount && world.enemies.activeCount < 14) {
    applyCommand(world, { type: 'welle-starten' });
  }

  const zeit = jetzt / 1000;
  if (drehenAn) {
    drehung += dt * 0.00004;
    setzeKamera();
  }

  // Gegner
  const lebende = new Set<number>();
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    lebende.add(enemy.id);
    const bild = gegnerBild(enemy);
    if (bild === null) continue;
    bild.gruppe.position.set(enemy.x, HOEHE.weg, enemy.y);
    bild.gruppe.rotation.y = -((enemy.heading * Math.PI) / 180);
    // baseSpeed, nicht speed: das Feld heisst anders, und "undefined" hier
    // hat als NaN die ganze Drehmatrix vergiftet.
    bewege(bild.teile, zeit, 6 * Math.max(0.2, enemy.baseSpeed));
  }
  for (const [id, bild] of gegnerBilder) {
    if (lebende.has(id)) continue;
    szene.remove(bild.gruppe);
    gegnerBilder.delete(id);
  }

  // Tuerme drehen sich zum Ziel.
  for (const turm of world.towers.items) {
    if (!turm.active) continue;
    const bild = turmBilder.get(turm.id);
    if (bild === undefined) continue;
    const kopf = bild.teile[bild.teile.length - 1];
    if (kopf !== undefined) kopf.rotation.y = -((turm.heading * Math.PI) / 180);
  }

  // Geschosse
  const fliegende = new Set<number>();
  for (const geschoss of world.projectiles.items) {
    if (!geschoss.active) continue;
    fliegende.add(geschoss.id);
    let bild = geschossBilder.get(geschoss.id);
    if (bild === undefined) {
      bild = new THREE.Mesh(
        new THREE.SphereGeometry(VOXEL * 1.6, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
      );
      szene.add(bild);
      geschossBilder.set(geschoss.id, bild);
    }
    bild.position.set(geschoss.x, HOEHE.boden + 0.55, geschoss.y);
  }
  for (const [id, bild] of geschossBilder) {
    if (fliegende.has(id)) continue;
    szene.remove(bild);
    geschossBilder.delete(id);
  }

  staub.rotation.y = zeit * 0.01;
  // Vor der Nachbearbeitung ablesen: nach komponist.render() steht im Zaehler
  // nur noch der letzte Durchgang, und das ist ein Vollbild-Viereck.
  renderer.info.reset();
  komponist.render();
  const zeichenbefehle = renderer.info.render.calls;

  bilder++;
  if (jetzt - fensterStart >= 500) {
    fps = Math.round((bilder * 1000) / (jetzt - fensterStart));
    bilder = 0;
    fensterStart = jetzt;
    if (anzeige !== null) {
      anzeige.textContent =
        `${fps} Bilder/s · ${stufe.name} · ${world.enemies.activeCount} Gegner · ` +
        `Welle ${world.wavesStarted}/${world.waveCount} · ` +
        `${zeichenbefehle} Zeichenbefehle`;
    }
  }
}
bild();
