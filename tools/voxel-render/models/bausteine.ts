/**
 * Bausteine fuer Voxelmodelle.
 *
 * Statt jedes Wesen einzeln aus Kaesten zusammenzusetzen, gibt es hier wenige
 * parametrisierte Grundformen. Das haelt den Stil ueber alle Modelle hinweg
 * gleich, und genau diese Gleichmaessigkeit entscheidet spaeter darueber, ob
 * das Spiel teuer aussieht.
 *
 * Koordinaten: x rechts, y oben, z hinten. Der Boden liegt bei y gleich null.
 * Blickrichtung eines Wesens ist plus z.
 */

import type { VoxelBox, VoxelModel, VoxelPart } from '../voxel';

type Triple = readonly [number, number, number];

export function box(
  pos: Triple,
  size: Triple,
  color: string,
  extra: { glow?: number; grain?: number } = {},
): VoxelBox {
  return { pos, size, color, ...extra };
}

export function part(
  name: string,
  pivot: Triple,
  boxes: readonly VoxelBox[],
  options: {
    swing?: { axis: 'x' | 'y' | 'z'; amp: number; phase: number };
    bob?: { amp: number; phase: number };
  } = {},
): VoxelPart {
  return { name, pivot, boxes, ...options };
}

export interface HumanoidOptions {
  readonly id: string;
  readonly skin: string;
  readonly cloth: string;
  readonly accent: string;
  /** Gesamthoehe in Voxeln. Standard 32. */
  readonly height?: number;
  readonly breite?: number;
  /** Wie weit Arme und Beine ausschlagen, im Bogenmass. */
  readonly stride?: number;
  /** Zusaetzliche Kaesten, etwa eine Waffe. Werden am rechten Arm befestigt. */
  readonly handProps?: readonly VoxelBox[];
  readonly headProps?: readonly VoxelBox[];
  readonly bodyProps?: readonly VoxelBox[];
  readonly eyes?: { color: string; glow?: number };
  /** Arme nach vorn gestreckt statt haengend. */
  readonly armsForward?: boolean;
}

/**
 * Eine humanoide Figur nach dem Vorbild eckiger Klotzwesen.
 * Beine und Arme pendeln gegenlaeufig, der Koerper wippt leicht mit.
 */
export function humanoid(options: HumanoidOptions): VoxelModel {
  const height = options.height ?? 32;
  const einheit = height / 32;
  const breite = (options.breite ?? 8) * einheit;
  const beinHoehe = 12 * einheit;
  const rumpfHoehe = 12 * einheit;
  const kopf = 8 * einheit;
  const beinBreite = breite / 2;
  const tiefe = 4 * einheit;
  const stride = options.stride ?? 0.42;

  const augen: VoxelBox[] =
    options.eyes === undefined
      ? []
      : [
          box(
            [-kopf / 4, beinHoehe + rumpfHoehe + kopf * 0.6, kopf / 2],
            [kopf / 4, kopf / 5, einheit],
            options.eyes.color,
            { glow: options.eyes.glow ?? 0.4, grain: 0 },
          ),
          box(
            [kopf / 4, beinHoehe + rumpfHoehe + kopf * 0.6, kopf / 2],
            [kopf / 4, kopf / 5, einheit],
            options.eyes.color,
            { glow: options.eyes.glow ?? 0.4, grain: 0 },
          ),
        ];

  const armLaenge = rumpfHoehe;
  const armDicke = 3 * einheit;
  const schulter = beinHoehe + rumpfHoehe - armDicke / 2;
  const armVersatz = options.armsForward === true ? tiefe : 0;

  return {
    id: options.id,
    parts: [
      part(
        'beinLinks',
        [-beinBreite / 2, beinHoehe, 0],
        [box([-beinBreite / 2, beinHoehe / 2, 0], [beinBreite, beinHoehe, tiefe], options.cloth)],
        { swing: { axis: 'x', amp: stride, phase: 0 } },
      ),
      part(
        'beinRechts',
        [beinBreite / 2, beinHoehe, 0],
        [box([beinBreite / 2, beinHoehe / 2, 0], [beinBreite, beinHoehe, tiefe], options.cloth)],
        { swing: { axis: 'x', amp: stride, phase: Math.PI } },
      ),
      part(
        'rumpf',
        [0, beinHoehe, 0],
        [
          box([0, beinHoehe + rumpfHoehe / 2, 0], [breite, rumpfHoehe, tiefe], options.skin),
          ...(options.bodyProps ?? []),
        ],
        { bob: { amp: 0.35 * einheit, phase: Math.PI / 2 } },
      ),
      part(
        'armLinks',
        [-breite / 2 - armDicke / 2, schulter, 0],
        [
          box(
            [-breite / 2 - armDicke / 2, schulter - armLaenge / 2, armVersatz],
            [armDicke, armLaenge, armDicke],
            options.accent,
          ),
        ],
        { swing: { axis: 'x', amp: stride * 0.8, phase: Math.PI } },
      ),
      part(
        'armRechts',
        [breite / 2 + armDicke / 2, schulter, 0],
        [
          box(
            [breite / 2 + armDicke / 2, schulter - armLaenge / 2, armVersatz],
            [armDicke, armLaenge, armDicke],
            options.accent,
          ),
          ...(options.handProps ?? []),
        ],
        { swing: { axis: 'x', amp: stride * 0.8, phase: 0 } },
      ),
      part(
        'kopf',
        [0, beinHoehe + rumpfHoehe, 0],
        [
          box([0, beinHoehe + rumpfHoehe + kopf / 2, 0], [kopf, kopf, kopf], options.skin),
          ...augen,
          ...(options.headProps ?? []),
        ],
        { bob: { amp: 0.35 * einheit, phase: Math.PI / 2 } },
      ),
    ],
  };
}

export interface QuadrupedOptions {
  readonly id: string;
  readonly body: string;
  readonly legs: string;
  readonly accent: string;
  readonly length?: number;
  readonly height?: number;
  readonly width?: number;
  readonly legCount?: 4 | 6 | 8;
  readonly eyes?: { color: string; glow?: number };
  readonly bodyProps?: readonly VoxelBox[];
  readonly headSize?: number;
}

/** Ein vier- bis achtbeiniges Wesen. Beine pendeln paarweise gegenlaeufig. */
export function quadruped(options: QuadrupedOptions): VoxelModel {
  const laenge = options.length ?? 14;
  const hoehe = options.height ?? 10;
  const breite = options.width ?? 10;
  const beinCount = options.legCount ?? 4;
  const paare = beinCount / 2;
  const beinHoehe = hoehe * 0.45;
  const rumpfY = beinHoehe + (hoehe - beinHoehe) / 2;
  const beinDicke = Math.max(1.5, breite / 6);
  const kopf = options.headSize ?? hoehe * 0.7;

  const beine: VoxelPart[] = [];
  for (let i = 0; i < paare; i++) {
    const z = paare === 1 ? 0 : -laenge / 2 + (laenge * (i + 0.5)) / paare;
    for (const seite of [-1, 1]) {
      beine.push(
        part(
          `bein${i}${seite}`,
          [(seite * breite) / 2, beinHoehe, z],
          [
            box(
              [(seite * breite) / 2, beinHoehe / 2, z],
              [beinDicke, beinHoehe, beinDicke],
              options.legs,
            ),
          ],
          { swing: { axis: 'x', amp: 0.4, phase: (i + (seite > 0 ? 1 : 0)) * Math.PI } },
        ),
      );
    }
  }

  const augen: VoxelBox[] =
    options.eyes === undefined
      ? []
      : [-1, 1].map((seite) =>
          box(
            [(seite * kopf) / 4, rumpfY + kopf * 0.2, laenge / 2 + kopf * 0.75],
            [kopf / 4, kopf / 4, 0.8],
            options.eyes?.color ?? '#ffffff',
            { glow: options.eyes?.glow ?? 0.5, grain: 0 },
          ),
        );

  return {
    id: options.id,
    parts: [
      ...beine,
      part(
        'rumpf',
        [0, rumpfY, 0],
        [
          box([0, rumpfY, 0], [breite, hoehe - beinHoehe, laenge], options.body),
          ...(options.bodyProps ?? []),
        ],
        { bob: { amp: 0.3, phase: Math.PI / 2 } },
      ),
      part(
        'kopf',
        [0, rumpfY, laenge / 2],
        [
          box([0, rumpfY, laenge / 2 + kopf / 2], [kopf, kopf, kopf], options.accent),
          ...augen,
        ],
        { bob: { amp: 0.4, phase: Math.PI / 2 } },
      ),
    ],
  };
}

export interface FloaterOptions {
  readonly id: string;
  readonly core: string;
  readonly shell: string;
  readonly glowColor: string;
  readonly size?: number;
  readonly hover?: number;
  readonly wings?: { color: string; span: number };
}

/** Ein schwebendes Wesen. Kern, Huelle und wahlweise schlagende Fluegel. */
export function floater(options: FloaterOptions): VoxelModel {
  const size = options.size ?? 8;
  const mitte = size;

  const fluegel: VoxelPart[] = [];
  if (options.wings !== undefined) {
    for (const seite of [-1, 1]) {
      fluegel.push(
        part(
          `fluegel${seite}`,
          [0, mitte, 0],
          [
            box(
              [(seite * (size / 2 + options.wings.span / 2)) / 1, mitte, -size * 0.1],
              [options.wings.span, 1, size * 1.3],
              options.wings.color,
              { grain: 0.16 },
            ),
          ],
          { swing: { axis: 'z', amp: 0.6 * seite, phase: 0 } },
        ),
      );
    }
  }

  return {
    id: options.id,
    hover: options.hover ?? 0,
    parts: [
      ...fluegel,
      part(
        'huelle',
        [0, mitte, 0],
        [
          box([0, mitte, 0], [size, size, size], options.shell),
          box([0, mitte, 0], [size * 0.55, size * 0.55, size * 0.55], options.core, {
            glow: 0.55,
            grain: 0.05,
          }),
          box([0, mitte + size * 0.55, 0], [size * 0.3, size * 0.3, size * 0.3], options.glowColor, {
            glow: 0.7,
            grain: 0,
          }),
        ],
        { bob: { amp: size * 0.14, phase: 0 } },
      ),
    ],
  };
}

export interface TowerOptions {
  readonly id: string;
  /** Sockelfarbe, meist Stein. */
  readonly base: string;
  readonly mid: string;
  readonly accent: string;
  readonly glowColor?: string;
  /** Ausbaustufe null bis drei. Bestimmt Hoehe und Zierrat. */
  readonly level: number;
  /** Aufbau auf dem Turmkopf. Dreht sich mit der Zielrichtung. */
  readonly head: (y: number, einheit: number) => readonly VoxelBox[];
}

/**
 * Ein Turm.
 *
 * Sockel und Schaft wachsen mit der Ausbaustufe, der Kopf kommt vom Turmtyp.
 * Der Unterschied zwischen den Stufen ist bewusst gross: auf einer vollen
 * Karte muss man einem Turm aus zwei Metern Entfernung ansehen, wie weit er
 * ausgebaut ist. Deshalb waechst nicht nur die Hoehe, sondern auch die Breite,
 * und ab Stufe zwei kommt Zierrat dazu, der die Silhouette veraendert.
 *
 * Stufe 0: gedrungener Stumpf.
 * Stufe 1: hoeherer Schaft mit Zierring.
 * Stufe 2: breiter Sockel, vier Eckpfeiler, Banner.
 * Stufe 3: Turm mit Kranz, Leuchtsteinen und Fahne.
 */
export function tower(options: TowerOptions): VoxelModel {
  const level = Math.max(0, Math.min(3, options.level));
  const glow = options.glowColor ?? options.accent;

  const sockelHoehe = 3.5 + level * 0.8;
  const sockelBreite = 12 + level * 1.5;
  const schaftHoehe = 4.5 + level * 4.4;
  const schaftBreite = 8.5 + level * 0.9;
  const kopfY = sockelHoehe + schaftHoehe;

  const sockel: VoxelBox[] = [
    box([0, sockelHoehe / 2, 0], [sockelBreite, sockelHoehe, sockelBreite], options.base),
    box([0, sockelHoehe + 0.5, 0], [sockelBreite - 2, 1, sockelBreite - 2], options.mid),
  ];
  if (level >= 2) {
    // Eine zweite Stufe am Sockel. Macht den Turm von unten her breiter.
    sockel.unshift(
      box([0, 1, 0], [sockelBreite + 3, 2, sockelBreite + 3], options.base, { grain: 0.12 }),
    );
  }

  const schaft: VoxelBox[] = [
    box([0, sockelHoehe + schaftHoehe / 2, 0], [schaftBreite, schaftHoehe, schaftBreite], options.mid),
  ];

  // Ab Stufe eins ein Zierring auf halber Hoehe.
  if (level >= 1) {
    schaft.push(
      box(
        [0, sockelHoehe + schaftHoehe * 0.5, 0],
        [schaftBreite + 1.8, 1.4, schaftBreite + 1.8],
        options.accent,
      ),
    );
  }

  // Ab Stufe zwei vier Eckpfeiler und ein Banner.
  if (level >= 2) {
    const pfeilerHoehe = schaftHoehe * 0.8;
    const abstand = sockelBreite / 2.6;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        schaft.push(
          box(
            [sx * abstand, sockelHoehe + pfeilerHoehe / 2, sz * abstand],
            [2.8, pfeilerHoehe, 2.8],
            options.accent,
          ),
        );
        if (level >= 3) {
          // Kappen mit Leuchtstein obenauf.
          schaft.push(
            box(
              [sx * abstand, sockelHoehe + pfeilerHoehe + 1, sz * abstand],
              [3.8, 2, 3.8],
              options.base,
            ),
            box(
              [sx * abstand, sockelHoehe + pfeilerHoehe + 2.8, sz * abstand],
              [1.8, 1.8, 1.8],
              glow,
              { glow: 0.9, grain: 0 },
            ),
          );
        }
      }
    }
    schaft.push(
      box(
        [0, sockelHoehe + schaftHoehe * 0.42, schaftBreite / 2 + 0.6],
        [schaftBreite * 0.55, schaftHoehe * 0.5, 0.7],
        options.accent,
        { grain: 0.16 },
      ),
    );
  }

  // Auf Stufe drei ein Kranz unter dem Kopf und eine Fahne.
  if (level >= 3) {
    schaft.push(
      box([0, kopfY - 1, 0], [schaftBreite + 5, 2, schaftBreite + 5], options.accent),
      box([0, kopfY - 2.4, 0], [schaftBreite + 3, 1.4, schaftBreite + 3], options.base),
    );
    for (const seite of [-1, 1]) {
      schaft.push(
        box([(seite * (schaftBreite + 4.4)) / 2, kopfY - 1, 0], [1.6, 1.6, 1.6], glow, {
          glow: 1,
          grain: 0,
        }),
        box([0, kopfY - 1, (seite * (schaftBreite + 4.4)) / 2], [1.6, 1.6, 1.6], glow, {
          glow: 1,
          grain: 0,
        }),
      );
    }

    const fahnenX = sockelBreite / 2.6;
    const fahnenY = sockelHoehe + schaftHoehe * 0.8 + 4;
    schaft.push(
      box([fahnenX, fahnenY + 4, fahnenX], [1, 9, 1], options.base),
      box([fahnenX + 3, fahnenY + 6.5, fahnenX], [5, 4, 0.8], options.accent, { grain: 0.18 }),
    );
  }

  return {
    id: options.id,
    parts: [
      part('sockel', [0, 0, 0], sockel),
      part('schaft', [0, sockelHoehe, 0], schaft),
      part('kopf', [0, kopfY, 0], [...options.head(kopfY, 1)]),
    ],
  };
}
