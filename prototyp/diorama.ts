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
import { AbzugShader } from './abzug';
import { knetWerte, machKnete } from './knete';
import { baueBedienfeld } from './regler';
import type { Stimmung } from './regler';
import { baueHimmel } from './himmel';
import { baueBodenschatten } from './bodenschatten';

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
  { name: 'Mittel', schatten: 1024, bluehen: true, tiltShift: true, aufloesung: 1.5 },
  { name: 'Sparsam', schatten: 1024, bluehen: false, tiltShift: false, aufloesung: 1 },
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

// Hintergrund: ein Farbverlauf statt einer Flaeche. Ein einfarbiger Grund
// sieht nach leerem Fenster aus; ein Verlauf sieht nach Raum aus, in dem das
// Modell steht. Er kostet ein Dreieck.
const himmel = baueHimmel(70);
szene.add(himmel.netz);
// Dunst sehr sparsam: er soll die Ferne kuehlen, nicht die Insel schlucken.
// Zu viel davon ist der haeufigste Grund, warum eine Szene milchig aussieht.
szene.fog = new THREE.FogExp2(farben.nebel, 0.004);

// Nahe und ferne Ebene eng: der Tiefenpuffer ist die Grundlage der
// Kontaktschatten, und ueber 400 Einheiten verteilt hat er in der Naehe der
// Insel keine brauchbare Aufloesung mehr. Der Himmel folgt deshalb der
// Kamera, statt weit hinten zu stehen.
const kamera = new THREE.PerspectiveCamera(32, 1, 1, 160);

// --- Leuchte -------------------------------------------------------------
// Drei Lichter, wie auf einem Aufnahmetisch:
//
//   Fuehrungslicht  warm, von schraeg vorn oben, wirft die Schatten
//   Gegenlicht      kuehl, von hinten, zeichnet die Silhouetten nach
//   Himmelslicht    weich von oben, mit Rueckwurf vom Untergrund
//
// Das Gegenlicht ist der Grund, warum die Figuren vor dem Hintergrund
// stehen statt darin zu kleben. Es wirft bewusst keinen Schatten.
const sonne = new THREE.DirectionalLight(farben.licht, 3.0);
sonne.castShadow = true;
sonne.shadow.camera.left = -20;
sonne.shadow.camera.right = 20;
sonne.shadow.camera.top = 20;
sonne.shadow.camera.bottom = -20;
sonne.shadow.camera.far = 80;
sonne.shadow.bias = -0.0012;
sonne.shadow.normalBias = 0.02;
szene.add(sonne);

const gegenlicht = new THREE.DirectionalLight(farben.fuellicht, 1.6);
gegenlicht.position.set(16, 7, 14);
szene.add(gegenlicht);

const himmelslicht = new THREE.HemisphereLight(farben.fuellicht, farben.sockel, 2.2);
szene.add(himmelslicht);

// Stand der Sonne, als Winkel. Zwei Regler statt drei Koordinaten: so laesst
// sich der Schattenwurf suchen, ohne ueber Vektoren nachzudenken.
const sonnenStand = { richtung: 2.4, hoehe: 0.85 };
function setzeSonne(): void {
  const r = 26;
  sonne.position.set(
    Math.cos(sonnenStand.richtung) * Math.cos(sonnenStand.hoehe) * r,
    Math.sin(sonnenStand.hoehe) * r,
    Math.sin(sonnenStand.richtung) * Math.cos(sonnenStand.hoehe) * r,
  );
}
setzeSonne();

// --- Knetmaterial ----------------------------------------------------------
// Sehr rau und ohne Metallanteil. Knete glaenzt nur breit und stumpf; jeder
// scharfe Glanzpunkt wuerde sie sofort zu Kunststoff machen.
const materialFest = machKnete(
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.0 }),
);
const materialLeuchtend = new THREE.MeshBasicMaterial({ vertexColors: true });
const materialien = { fest: materialFest, leuchtend: materialLeuchtend };

// Gegner bekommen dasselbe Material mit einem Hauch Eigenleuchten. Nicht aus
// Effekthascherei: in einer dunklen Stimmung verschwinden dunkle Figuren
// sonst im Untergrund, und ein Gegner, den man nicht sieht, ist ein Fehler im
// Spiel und nicht im Bild.
const materialienGegner = {
  fest: machKnete(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
      emissive: new THREE.Color(0x24313f),
      emissiveIntensity: 0.55,
    }),
  ),
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

// --- Fackellicht -----------------------------------------------------------
// Die Fackeln haben bisher nur geleuchtet, ohne zu leuchten: selbstleuchtende
// Kaesten, die nichts beschienen haben. Nachts blieb die Insel deshalb
// schwarz, obwohl ueberall Feuer stand.
//
// Ein paar Punktlichter loesen das. Bewusst nur die naechsten sechs - jedes
// weitere kostet einen Durchgang je Flaeche, und mehr als sechs Lichtkreise
// sieht auf einer Karte dieser Groesse ohnehin niemand.
const fackeln = level.props.filter((prop) => prop.model === 'prop_fackel').slice(0, 6);
const fackelLichter = fackeln.map((prop) => {
  const licht = new THREE.PointLight(0xffb060, 0, 7, 1.7);
  licht.position.set(prop.x, HOEHE.boden + 0.95, prop.y);
  szene.add(licht);
  return licht;
});
function setzeFackeln(staerke: number): void {
  for (const licht of fackelLichter) licht.intensity = staerke;
}

// Ein Fleck je Turm, je Requisite und je Gegner, mit Luft nach oben.
const bodenschatten = baueBodenschatten(400);
szene.add(bodenschatten.netz);

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

// Flecken fuer alles, was stehen bleibt. Sie werden einmal gesetzt; die
// Gegner haengen sich weiter hinten dahinter.
let festeFlecken = 0;
for (const prop of level.props) {
  const bau = modelle.get(prop.model);
  if (bau === undefined) continue;
  // Breite aus der Hoehe geschaetzt: ein Baum wirft einen groesseren Fleck
  // als ein Stein, und die Hoehe ist die Angabe, die jedes Modell hat.
  bodenschatten.setze(festeFlecken++, prop.x, HOEHE.boden + 0.012, prop.y, 0.55 + bau.hoehe * 0.42);
}
for (const turm of world.towers.items) {
  if (!turm.active) continue;
  bodenschatten.setze(festeFlecken++, turm.x, HOEHE.boden + 0.012, turm.y, 1.05);
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

// Zu den Kontaktschatten: erst stand hier ein GTAO-Durchgang im Bildraum.
// Er hat in diesem Aufbau messbar nichts geliefert - die Abschattung kam
// weiss heraus, bei jeder Einstellung. Statt ihn weiter zu suchen, sitzt die
// Abschattung jetzt an zwei Stellen, an denen sie ohnehin besser aufgehoben
// ist: in den Modellen gebacken (siehe glatt.ts) und als weicher Fleck unter
// jedem Koerper (siehe bodenschatten.ts). Beides kostet zur Laufzeit nichts,
// und eine Welt, die fast stillsteht, muss so etwas nicht sechzig Mal in der
// Sekunde neu rechnen.

const bluehen = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.55);
const tiltWaagerecht = new ShaderPass(TiltShiftShader);
const tiltSenkrecht = new ShaderPass(TiltShiftShader);
const senkrechtWert = tiltSenkrecht.uniforms['senkrecht'];
if (senkrechtWert !== undefined) senkrechtWert.value = 1;
const abzug = new ShaderPass(AbzugShader);
const ausgabe = new OutputPass();

/** Greift ein Uniform eines Durchgangs, ohne bei Tippfehlern still zu werden. */
function feld(durchgang: ShaderPass, name: string): { value: number } {
  const u = durchgang.uniforms[name] as { value: number } | undefined;
  if (u === undefined) throw new Error(`Uniform ${name} fehlt.`);
  return u;
}

function baueKette(): void {
  komponist.passes.length = 0;
  komponist.addPass(renderDurchgang);
  if (stufe.bluehen) komponist.addPass(bluehen);
  if (stufe.tiltShift) {
    komponist.addPass(tiltWaagerecht);
    komponist.addPass(tiltSenkrecht);
  }
  komponist.addPass(abzug);
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
    const u = p.uniforms['aufloesung'] as { value: THREE.Vector2 } | undefined;
    u?.value.set(b * dpr, h * dpr);
  }
}
window.addEventListener('resize', passeGroesseAn);
setzeStufe(STUFEN[0] as Stufe);
setzeKamera();

// --- Stimmungen ------------------------------------------------------------
// Jede Stimmung ist eine Behauptung darueber, wie das Spiel aussehen koennte.
// Nebeneinander auf Tasten beantworten sie die Stilfrage schneller als jede
// Beschreibung.
function stelleSzene(
  himmelOben: string,
  himmelUnten: string,
  schimmer: string,
  nebel: string,
  sonnenFarbe: string,
  gegenFarbe: string,
  himmelFarbe: string,
  bodenFarbe: string,
  saum: string,
): void {
  himmel.setze(himmelOben, himmelUnten, schimmer);
  (szene.fog as THREE.FogExp2).color.set(nebel);
  sonne.color.set(sonnenFarbe);
  gegenlicht.color.set(gegenFarbe);
  himmelslicht.color.set(himmelFarbe);
  himmelslicht.groundColor.set(bodenFarbe);
  knetWerte.randFarbe.value.set(saum);
}

const STIMMUNGEN: readonly Stimmung[] = [
  {
    name: 'Werkbank',
    dann: () => {
      stelleSzene('#6d89a8', '#c2a883', '#e8d5b4', '#93a6a8', '#fff2dc', '#9dc4ee', '#cfe2f5', '#8a7256', '#ff9e6a');
      sonnenStand.richtung = 2.35;
      sonnenStand.hoehe = 0.78;
      setzeSonne();
    },
    werte: {
      belichtung: 1.05, sonne: 3.0, gegenlicht: 1.5, himmelslicht: 2.9,
      fackeln: 1.5, kontakt: 0.62, kehlen: 1.0, dunst: 0.004, korn: 0.7, beulen: 0.5, randlicht: 0.3,
      bluehen: 0.12, unschaerfe: 13, koernung: 0.05, abschattung: 0.3,
      saettigung: 0.94, toenung: 0.22,
    },
  },
  {
    name: 'Abendsonne',
    dann: () => {
      stelleSzene('#131f4a', '#2e1c30', '#ff9a4e', '#3a2a42', '#ffc68a', '#6f92e0', '#9aa8d8', '#5a3c30', '#ff8a52');
      sonnenStand.richtung = 0.9;
      sonnenStand.hoehe = 0.3;
      setzeSonne();
    },
    werte: {
      belichtung: 1.15, sonne: 5.0, gegenlicht: 1.9, himmelslicht: 2.2,
      fackeln: 5.0, kontakt: 0.5, kehlen: 0.95, dunst: 0.005, korn: 0.6, beulen: 0.45, randlicht: 0.5,
      bluehen: 0.3, unschaerfe: 15, koernung: 0.05, abschattung: 0.42,
      saettigung: 1.02, toenung: 0.34,
    },
  },
  {
    name: 'Nachtlager',
    dann: () => {
      stelleSzene('#060a12', '#101c28', '#33506b', '#0a1118', '#ffd9a8', '#4e7ab4', '#3c5c80', '#141c26', '#ffb070');
      sonnenStand.richtung = 2.1;
      sonnenStand.hoehe = 0.95;
      setzeSonne();
    },
    werte: {
      belichtung: 1.5, sonne: 1.9, gegenlicht: 2.2, himmelslicht: 3.2,
      fackeln: 11.0, kontakt: 0.5, kehlen: 0.85, dunst: 0.007, korn: 0.5, beulen: 0.4, randlicht: 0.55,
      bluehen: 0.7, unschaerfe: 12, koernung: 0.07, abschattung: 0.5,
      saettigung: 1.02, toenung: 0.3,
    },
  },
  {
    name: 'Schaukasten',
    dann: () => {
      stelleSzene('#141c26', '#232d38', '#6b8096', '#1a222c', '#ffffff', '#cfe4ff', '#dce8f4', '#39424c', '#ffd2b0');
      sonnenStand.richtung = 2.6;
      sonnenStand.hoehe = 1.1;
      setzeSonne();
    },
    werte: {
      belichtung: 1.0, sonne: 2.8, gegenlicht: 2.0, himmelslicht: 2.6,
      fackeln: 0.0, kontakt: 0.7, kehlen: 1.25, dunst: 0.002, korn: 0.8, beulen: 0.6, randlicht: 0.22,
      bluehen: 0.1, unschaerfe: 18, koernung: 0.035, abschattung: 0.38,
      saettigung: 0.9, toenung: 0.08,
    },
  },
];

// --- Regler ----------------------------------------------------------------
const prozent = (w: number): string => `${Math.round(w * 100)}%`;
const bedienfeld = baueBedienfeld(
  document.body,
  [
    {
      name: 'Knete',
      regler: [
        { id: 'korn', name: 'Daumenabdruecke', von: 0, bis: 1.5, schritt: 0.05, wert: knetWerte.korn.value, zeige: prozent, setze: (w) => { knetWerte.korn.value = w; } },
        { id: 'beulen', name: 'Beulen', von: 0, bis: 1.5, schritt: 0.05, wert: knetWerte.beulen.value, zeige: prozent, setze: (w) => { knetWerte.beulen.value = w; } },
        { id: 'feinheit', name: 'Koernung', von: 6, bis: 60, schritt: 1, wert: knetWerte.kornFeinheit.value, zeige: (w) => w.toFixed(0), setze: (w) => { knetWerte.kornFeinheit.value = w; } },
        { id: 'randlicht', name: 'Durchscheinen', von: 0, bis: 1.2, schritt: 0.05, wert: knetWerte.rand.value, zeige: prozent, setze: (w) => { knetWerte.rand.value = w; } },
        { id: 'rauheit', name: 'Mattheit', von: 0.2, bis: 1, schritt: 0.02, wert: materialFest.roughness, zeige: prozent, setze: (w) => { materialFest.roughness = w; materialienGegner.fest.roughness = w; } },
      ],
    },
    {
      name: 'Licht',
      regler: [
        { id: 'belichtung', name: 'Belichtung', von: 0.4, bis: 2.4, schritt: 0.05, wert: renderer.toneMappingExposure, setze: (w) => { renderer.toneMappingExposure = w; } },
        { id: 'sonne', name: 'Fuehrungslicht', von: 0, bis: 6, schritt: 0.1, wert: sonne.intensity, setze: (w) => { sonne.intensity = w; } },
        { id: 'gegenlicht', name: 'Gegenlicht', von: 0, bis: 4, schritt: 0.1, wert: gegenlicht.intensity, setze: (w) => { gegenlicht.intensity = w; } },
        { id: 'himmelslicht', name: 'Himmelslicht', von: 0, bis: 4, schritt: 0.1, wert: himmelslicht.intensity, setze: (w) => { himmelslicht.intensity = w; } },
        { id: 'fackeln', name: 'Fackelschein', von: 0, bis: 14, schritt: 0.2, wert: 0, zeige: (w) => w.toFixed(1), setze: setzeFackeln },
        { id: 'sonnenrichtung', name: 'Sonnenrichtung', von: 0, bis: 6.28, schritt: 0.02, wert: sonnenStand.richtung, zeige: (w) => `${Math.round((w * 180) / Math.PI)}\u00b0`, setze: (w) => { sonnenStand.richtung = w; setzeSonne(); } },
        { id: 'sonnenhoehe', name: 'Sonnenhoehe', von: 0.08, bis: 1.4, schritt: 0.02, wert: sonnenStand.hoehe, zeige: (w) => `${Math.round((w * 180) / Math.PI)}\u00b0`, setze: (w) => { sonnenStand.hoehe = w; setzeSonne(); } },
        { id: 'kehlen', name: 'Kehlschatten', von: 0, bis: 1.6, schritt: 0.05, wert: knetWerte.kehle.value, zeige: prozent, setze: (w) => { knetWerte.kehle.value = w; } },
        { id: 'kontakt', name: 'Bodenschatten', von: 0, bis: 1, schritt: 0.02, wert: bodenschatten.material.opacity, zeige: prozent, setze: (w) => { bodenschatten.material.opacity = w; } },
        { id: 'dunst', name: 'Dunst', von: 0, bis: 0.02, schritt: 0.0005, wert: 0.004, zeige: (w) => `${(w * 1000).toFixed(1)}`, setze: (w) => { (szene.fog as THREE.FogExp2).density = w; } },
      ],
    },
    {
      name: 'Objektiv',
      regler: [
        { id: 'unschaerfe', name: 'Tilt-Shift', von: 0, bis: 30, schritt: 1, wert: feld(tiltWaagerecht, 'staerke').value, zeige: (w) => `${w.toFixed(0)} px`, setze: (w) => { feld(tiltWaagerecht, 'staerke').value = w; feld(tiltSenkrecht, 'staerke').value = w; } },
        { id: 'schaerfeband', name: 'Schaerfeband', von: 0.05, bis: 0.6, schritt: 0.01, wert: feld(tiltWaagerecht, 'breite').value, zeige: prozent, setze: (w) => { feld(tiltWaagerecht, 'breite').value = w; feld(tiltSenkrecht, 'breite').value = w; } },
        { id: 'bluehen', name: 'Leuchten', von: 0, bis: 1.6, schritt: 0.05, wert: bluehen.strength, zeige: prozent, setze: (w) => { bluehen.strength = w; } },
        { id: 'koernung', name: 'Filmkorn', von: 0, bis: 0.4, schritt: 0.01, wert: feld(abzug, 'koernung').value, zeige: prozent, setze: (w) => { feld(abzug, 'koernung').value = w; } },
        { id: 'abschattung', name: 'Randabschattung', von: 0, bis: 1.0, schritt: 0.05, wert: feld(abzug, 'abschattung').value, zeige: prozent, setze: (w) => { feld(abzug, 'abschattung').value = w; } },
        { id: 'saettigung', name: 'Saettigung', von: 0.3, bis: 1.8, schritt: 0.02, wert: feld(abzug, 'saettigung').value, zeige: prozent, setze: (w) => { feld(abzug, 'saettigung').value = w; } },
        { id: 'toenung', name: 'Farbstimmung', von: 0, bis: 0.8, schritt: 0.02, wert: feld(abzug, 'toenung').value, zeige: prozent, setze: (w) => { feld(abzug, 'toenung').value = w; } },
      ],
    },
  ],
  STIMMUNGEN,
);
// Mit der ersten Stimmung anfangen, damit Bild und Regler von Anfang an
// dasselbe sagen.
const erste = STIMMUNGEN[0];
if (erste !== undefined) {
  erste.dann?.();
  bedienfeld.uebernimm(erste.werte);
}

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
  let flecken = festeFlecken;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    lebende.add(enemy.id);
    bodenschatten.setze(flecken++, enemy.x, HOEHE.weg + 0.012, enemy.y, 0.75);
    const bild = gegnerBild(enemy);
    if (bild === null) continue;
    bild.gruppe.position.set(enemy.x, HOEHE.weg, enemy.y);
    bild.gruppe.rotation.y = -((enemy.heading * Math.PI) / 180);
    // baseSpeed, nicht speed: das Feld heisst anders, und "undefined" hier
    // hat als NaN die ganze Drehmatrix vergiftet.
    bewege(bild.teile, zeit, 6 * Math.max(0.2, enemy.baseSpeed));
  }
  bodenschatten.zeige(flecken);
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

  himmel.netz.position.copy(kamera.position);
  staub.rotation.y = zeit * 0.01;
  feld(abzug, 'zeit').value = zeit;
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
