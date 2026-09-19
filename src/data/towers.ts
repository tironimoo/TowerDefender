/**
 * Turmdefinitionen.
 *
 * Reine Daten. Kein Verhalten, keine Sonderfaelle im Code. Die Werte stammen
 * aus docs/05-startwerte.md und sind der Ausgangspunkt fuer das Balancing.
 *
 * Vier Tuerme stehen von Beginn an bereit, die uebrigen acht kommen aus der
 * Forschung. Siehe docs/02-progression.md.
 */

import type {
  AuraEffect,
  FaehigkeitDef,
  TowerDef,
  TowerUpgradeDef,
  TurmBonus,
} from '@sim/model/types';
import { NO_EFFECT } from '@sim/model/types';

/** Drei gleichfoermige Ausbaustufen. Siehe docs/05-startwerte.md. */
const STANDARD_UPGRADES: readonly TowerUpgradeDef[] = [
  { costFactor: 0.6, damageBonus: 0.55, rangeBonus: 0.08 },
  { costFactor: 1.0, damageBonus: 0.55, rangeBonus: 0.08 },
  { costFactor: 1.6, damageBonus: 0.55, rangeBonus: 0.08 },
];

/** Unterstuetzungstuerme wachsen in der Wirkung, nicht im Schaden. */
const AURA_UPGRADES: readonly TowerUpgradeDef[] = [
  { costFactor: 0.7, damageBonus: 0, rangeBonus: 0.18 },
  { costFactor: 1.1, damageBonus: 0, rangeBonus: 0.18 },
  { costFactor: 1.7, damageBonus: 0, rangeBonus: 0.18 },
];

function aura(teil: Partial<AuraEffect>): AuraEffect {
  return {
    damageBonus: 0,
    rangeBonus: 0,
    fireRateBonus: 0,
    armorShred: 0,
    damageAmp: 0,
    reveal: false,
    aufGegner: false,
    ...teil,
  };
}

/**
 * Spezialfaehigkeiten.
 *
 * Verfuegbar erst, wenn ein Turm voll ausgebaut ist. Jeder Turm hat zwei, und
 * jede laesst sich zweimal steigern. Die Raenge wirken kumulativ.
 *
 * Sie sind der Goldspeicher der spaeten Partie. Ohne sie haette ein Spieler
 * mit vollen Bauplaetzen und ausgebauten Tuermen nichts mehr zu tun, waehrend
 * die Wellen weiter wachsen.
 */
const KOSTEN: readonly number[] = [1.4, 2.2];

function faehigkeit(
  id: string,
  name: string,
  beschreibung: string,
  raenge: readonly Partial<TurmBonus>[],
): FaehigkeitDef {
  return { id, name, beschreibung, kosten: KOSTEN, raenge };
}

const FAEHIGKEITEN: Readonly<Record<string, readonly FaehigkeitDef[]>> = {
  armbrustturm: [
    faehigkeit('armbrustturm-repetierer', 'Repetierer', 'Ein zweiter Spannhebel. Der Turm schiesst deutlich schneller.', [{ feuerrate: 1.35 }, { feuerrate: 1.26 }]),
    faehigkeit('armbrustturm-stahlbolzen', 'Stahlbolzen', 'Gehaertete Spitzen. Mehr Schaden und deutlich mehr Durchschlag.', [{ schaden: 1.15, durchschlag: 0.3 }, { schaden: 1.15, durchschlag: 0.3 }]),
  ],
  schleuder: [
    faehigkeit('schleuder-streuschuss', 'Streuschuss', 'Der Stein zerspringt beim Aufschlag und erfasst einen weiteren Umkreis.', [{ splash: 0.6 }, { splash: 0.6 }]),
    faehigkeit('schleuder-findling', 'Findling', 'Ein deutlich schwererer Brocken. Viel mehr Schaden je Treffer.', [{ schaden: 1.4 }, { schaden: 1.35 }]),
  ],
  frostturm: [
    faehigkeit('frostturm-dauerfrost', 'Dauerfrost', 'Der Frost beisst tiefer und haelt Gegner noch staerker auf.', [{ verlangsamung: 0.15 }, { verlangsamung: 0.15 }]),
    faehigkeit('frostturm-eislanze', 'Eislanze', 'Aus dem Frost wird eine echte Waffe. Ein Vielfaches an arkanem Schaden.', [{ schaden: 2.2 }, { schaden: 1.6 }]),
  ],
  glutduese: [
    faehigkeit('glutduese-flammenmeer', 'Flammenmeer', 'Die Flamme faechert weit auf und erfasst ganze Gruppen.', [{ splash: 0.7 }, { splash: 0.7 }]),
    faehigkeit('glutduese-zunder', 'Zunder', 'Gegner brennen sehr viel heisser und laenger nach.', [{ brandDps: 8 }, { brandDps: 10 }]),
  ],
  balliste: [
    faehigkeit('balliste-speerspitze', 'Speerspitze', 'Der Bolzen geht durch fast jede Panzerung hindurch.', [{ durchschlag: 0.35 }, { durchschlag: 0.35 }]),
    faehigkeit('balliste-windenwerk', 'Windenwerk', 'Eine Winde statt Muskelkraft. Die Balliste spannt viel schneller nach.', [{ feuerrate: 1.45 }, { feuerrate: 1.31 }]),
  ],
  blitzspule: [
    faehigkeit('blitzspule-funkenflug', 'Funkenflug', 'Der Blitz springt auf noch mehr Ziele. Die Antwort auf jeden Schwarm.', [{ kettenSpruenge: 2 }, { kettenSpruenge: 2 }]),
    faehigkeit('blitzspule-ueberladung', 'Ueberladung', 'Die Spule laeuft am Anschlag. Jeder Schlag trifft weit haerter.', [{ schaden: 1.45 }, { schaden: 1.38 }]),
  ],
  ambossfalle: [
    faehigkeit('ambossfalle-schwerkraft', 'Schwerkraft', 'Der Amboss faellt aus doppelter Hoehe. Verheerender Einschlag.', [{ schaden: 1.5 }, { schaden: 1.4 }]),
    faehigkeit('ambossfalle-sprungfeder', 'Sprungfeder', 'Eine staerkere Feder zieht den Amboss viel schneller wieder hoch.', [{ feuerrate: 1.6 }, { feuerrate: 1.38 }]),
  ],
  netzwerfer: [
    faehigkeit('netzwerfer-stacheln', 'Stacheln', 'Widerhaken im Netz. Aus der Fessel wird zusaetzlich Schaden.', [{ schadenPlus: 28 }, { schadenPlus: 42 }]),
    faehigkeit('netzwerfer-spulwerk', 'Spulwerk', 'Zwei Spulen im Wechsel. Kaum noch Pause zwischen zwei Wuerfen.', [{ feuerrate: 1.6 }, { feuerrate: 1.44 }]),
  ],
  kolbenstoss: [
    faehigkeit('kolbenstoss-sturmbock', 'Sturmbock', 'Ein Rammkopf aus Eisen. Der Stoss richtet erheblichen Schaden an.', [{ schaden: 2.0 }, { schaden: 1.6 }]),
    faehigkeit('kolbenstoss-breitschub', 'Breitschub', 'Eine breitere Platte erfasst deutlich mehr Gegner auf einmal.', [{ splash: 0.6 }, { splash: 0.6 }]),
  ],
  leuchtfeuer: [
    faehigkeit('leuchtfeuer-bannstrahl', 'Bannstrahl', 'Gebuendeltes Licht. Die Verstaerkung der Nachbarn steigt stark.', [{ auraStaerke: 1.35 }, { auraStaerke: 1.3 }]),
    faehigkeit('leuchtfeuer-fernlicht', 'Fernlicht', 'Das Licht reicht ueber einen viel groesseren Teil der Karte.', [{ reichweite: 1.4 }, { reichweite: 1.29 }]),
  ],
  alchemieturm: [
    faehigkeit('alchemieturm-scheidewasser', 'Scheidewasser', 'Eine schaerfere Mischung loest fast jede Panzerung auf.', [{ auraStaerke: 1.35 }, { auraStaerke: 1.3 }]),
    faehigkeit('alchemieturm-schwadenfeld', 'Schwadenfeld', 'Die Daempfe ziehen deutlich weiter ueber die Karte.', [{ reichweite: 1.4 }, { reichweite: 1.29 }]),
  ],
  spaehturm: [
    faehigkeit('spaehturm-horizont', 'Horizont', 'Ein hoeherer Ausguck. Der Blick reicht bis weit ueber die Karte.', [{ reichweite: 1.5 }, { reichweite: 1.33 }]),
    faehigkeit('spaehturm-zielrechner', 'Zielrechner', 'Die Nachbarn bekommen deutlich bessere Zielangaben.', [{ auraStaerke: 1.4 }, { auraStaerke: 1.36 }]),
  ],
};

export const TOWER_DEFS: readonly TowerDef[] = [
  {
    id: 'armbrustturm',
    name: 'Armbrustturm',
    beschreibung: 'Schneller Einzelschuss. Trifft auch Flieger. Der Grundstein jeder Verteidigung.',
    cost: 100,
    damage: 12,
    fireRate: 1.2,
    range: 3.5,
    damageType: 'physisch',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 12,
    projectileModel: 'schuss_pfeil',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.armbrustturm ?? [],
    forschung: null,
  },
  {
    id: 'schleuder',
    name: 'Schleuder',
    beschreibung: 'Bogenschuss mit Flaechenschaden. Zerlegt Schwaerme, trifft keine Luftziele.',
    cost: 140,
    damage: 30,
    fireRate: 0.6,
    range: 4.5,
    damageType: 'physisch',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 1.2,
    projectileSpeed: 8,
    projectileModel: 'schuss_stein',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.schleuder ?? [],
    forschung: null,
  },
  {
    id: 'frostturm',
    name: 'Frostturm',
    beschreibung:
      'Verlangsamt alles im Umkreis und richtet dabei etwas arkanen Schaden an. Die einzige arkane Quelle, die von Beginn an bereitsteht.',
    cost: 130,
    damage: 6,
    fireRate: 1.0,
    range: 2.5,
    damageType: 'arkan',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 2.5,
    projectileSpeed: 0,
    projectileModel: 'schuss_frost',
    onHit: { slowFactor: 0.35, slowDuration: 2.0, burnDps: 0, burnDuration: 0 },
    defaultPolicy: 'erster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.frostturm ?? [],
    forschung: null,
  },
  {
    id: 'glutduese',
    name: 'Glutduese',
    beschreibung: 'Dauerfeuer auf kurze Distanz, setzt Gegner in Brand. Gegen Obsidian fast wirkungslos.',
    cost: 160,
    damage: 8,
    fireRate: 4.0,
    range: 2.5,
    damageType: 'feuer',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 1.0,
    projectileSpeed: 0,
    projectileModel: 'schuss_glut',
    onHit: { slowFactor: 0, slowDuration: 0, burnDps: 6, burnDuration: 3 },
    defaultPolicy: 'erster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.glutduese ?? [],
    forschung: null,
  },
  {
    id: 'balliste',
    name: 'Balliste',
    beschreibung: 'Sehr grosse Reichweite, durchschlaegt die halbe Panzerung. Langsam und gegen Schwaerme nutzlos.',
    cost: 220,
    damage: 95,
    fireRate: 0.35,
    range: 7.0,
    damageType: 'physisch',
    targetsAir: true,
    armorPierce: 0.5,
    splashRadius: 0,
    projectileSpeed: 18,
    projectileModel: 'schuss_bolzen',
    onHit: NO_EFFECT,
    defaultPolicy: 'staerkster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.balliste ?? [],
    forschung: 'arsenal-balliste',
  },
  {
    id: 'blitzspule',
    name: 'Blitzspule',
    beschreibung: 'Arkaner Blitz, der auf drei weitere Ziele springt. Die Antwort auf dichte Schwaerme.',
    cost: 180,
    damage: 18,
    fireRate: 0.8,
    range: 3.0,
    damageType: 'arkan',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 0,
    projectileModel: 'schuss_blitz',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'kette', jumps: 3, falloff: 0.25 },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.blitzspule ?? [],
    forschung: 'arsenal-blitzspule',
  },
  {
    id: 'ambossfalle',
    name: 'Ambossfalle',
    beschreibung: 'Steht auf dem Weg statt daneben. Schlaegt einmal sehr hart zu und laedt lange nach.',
    cost: 90,
    damage: 120,
    fireRate: 0.125,
    range: 1.0,
    damageType: 'physisch',
    targetsAir: false,
    armorPierce: 0.25,
    splashRadius: 0.9,
    projectileSpeed: 0,
    projectileModel: 'schuss_stein',
    onHit: NO_EFFECT,
    defaultPolicy: 'staerkster',
    special: { kind: 'falle' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.ambossfalle ?? [],
    forschung: 'arsenal-ambossfalle',
  },
  {
    id: 'netzwerfer',
    name: 'Netzwerfer',
    beschreibung: 'Haelt ein einzelnes Ziel vollstaendig fest. Gegen einen Boss mehr wert als jeder Schaden.',
    cost: 150,
    damage: 0,
    fireRate: 0.14,
    range: 4.0,
    damageType: 'arkan',
    targetsAir: true,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 10,
    projectileModel: 'schuss_netz',
    onHit: { slowFactor: 1.0, slowDuration: 2.0, burnDps: 0, burnDuration: 0 },
    defaultPolicy: 'staerkster',
    special: { kind: 'keines' },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.netzwerfer ?? [],
    forschung: 'arsenal-netzwerfer',
  },
  {
    id: 'kolbenstoss',
    name: 'Kolbenstoss',
    beschreibung: 'Schiebt Gegner auf dem Weg zurueck. Schenkt der ganzen Verteidigung Zeit.',
    cost: 110,
    damage: 6,
    fireRate: 0.2,
    range: 1.8,
    damageType: 'physisch',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 1.8,
    projectileSpeed: 0,
    projectileModel: 'schuss_stein',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'rueckstoss', distance: 1.5 },
    upgrades: STANDARD_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.kolbenstoss ?? [],
    forschung: 'arsenal-kolbenstoss',
  },
  {
    id: 'leuchtfeuer',
    name: 'Leuchtfeuer',
    beschreibung: 'Verstaerkt benachbarte Tuerme. Wirkt nicht auf andere Leuchtfeuer.',
    cost: 200,
    damage: 0,
    fireRate: 0,
    range: 3.0,
    damageType: 'arkan',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 0,
    projectileModel: '',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'aura', effect: aura({ damageBonus: 0.2, rangeBonus: 0.15 }) },
    upgrades: AURA_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.leuchtfeuer ?? [],
    forschung: 'arsenal-leuchtfeuer',
  },
  {
    id: 'alchemieturm',
    name: 'Alchemieturm',
    beschreibung: 'Bricht die Panzerung der Gegner im Umkreis und erhoeht den Schaden, den sie erleiden.',
    cost: 190,
    damage: 0,
    fireRate: 0,
    range: 3.5,
    damageType: 'arkan',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 0,
    projectileModel: '',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'aura', effect: aura({ armorShred: 0.4, damageAmp: 0.15, aufGegner: true }) },
    upgrades: AURA_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.alchemieturm ?? [],
    forschung: 'arsenal-alchemie',
  },
  {
    id: 'spaehturm',
    name: 'Spaehturm',
    beschreibung: 'Deckt unsichtbare Gegner auf und erhoeht die Reichweite der Tuerme im Umkreis.',
    cost: 80,
    damage: 0,
    fireRate: 0,
    range: 5.0,
    damageType: 'arkan',
    targetsAir: false,
    armorPierce: 0,
    splashRadius: 0,
    projectileSpeed: 0,
    projectileModel: '',
    onHit: NO_EFFECT,
    defaultPolicy: 'erster',
    special: { kind: 'aura', effect: aura({ rangeBonus: 0.1, reveal: true }) },
    upgrades: AURA_UPGRADES,
    faehigkeiten: FAEHIGKEITEN.spaehturm ?? [],
    forschung: 'arsenal-spaehturm',
  },
];
