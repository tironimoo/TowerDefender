/**
 * Treffer, Tod, Blitze - alles, was kurz aufblitzt und wieder weg ist.
 *
 * Ein einziges Punktesystem fuer alles. Der Grund ist nicht Sparsamkeit,
 * sondern Verlaesslichkeit: bei einem festen Vorrat an Punkten kann eine
 * Welle mit zweihundert Gegnern die Bildrate nicht mehr einbrechen lassen,
 * egal wie viel gleichzeitig explodiert. Ist der Vorrat voll, ueberschreibt
 * der neueste Funke den aeltesten - und das sieht niemand.
 */

import * as THREE from 'three';
import type { DamageType } from '@sim/index';

const VORRAT = 900;

const FARBEN: Readonly<Record<DamageType, number>> = {
  physisch: 0xffe4b0,
  feuer: 0xff8a32,
  arkan: 0xc58aff,
};

/** Ein Funke lebt hoechstens so lange. */
const DAUER = 0.75;

export class Effekte3D {
  readonly punkte: THREE.Points;
  private readonly lagen: Float32Array;
  private readonly farben: Float32Array;
  private readonly groessen: Float32Array;
  private readonly tempo: Float32Array;
  private readonly rest: Float32Array;
  private naechster = 0;

  /** Blitze zwischen zwei Punkten, mit eigener Restdauer. */
  readonly striche: THREE.LineSegments;
  private readonly strichLagen: Float32Array;
  private readonly strichRest: Float32Array;
  private naechsterStrich = 0;
  private static readonly STRICHE = 24;

  constructor() {
    this.lagen = new Float32Array(VORRAT * 3);
    this.farben = new Float32Array(VORRAT * 3);
    this.groessen = new Float32Array(VORRAT);
    this.tempo = new Float32Array(VORRAT * 3);
    this.rest = new Float32Array(VORRAT);

    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute('position', new THREE.BufferAttribute(this.lagen, 3));
    geometrie.setAttribute('color', new THREE.BufferAttribute(this.farben, 3));
    geometrie.setAttribute('size', new THREE.BufferAttribute(this.groessen, 1));
    this.punkte = new THREE.Points(
      geometrie,
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.14,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.punkte.frustumCulled = false;
    this.punkte.renderOrder = 3;

    this.strichLagen = new Float32Array(Effekte3D.STRICHE * 6);
    this.strichRest = new Float32Array(Effekte3D.STRICHE);
    const strichGeometrie = new THREE.BufferGeometry();
    strichGeometrie.setAttribute('position', new THREE.BufferAttribute(this.strichLagen, 3));
    this.striche = new THREE.LineSegments(
      strichGeometrie,
      new THREE.LineBasicMaterial({
        color: 0xc58aff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.striche.frustumCulled = false;
    this.striche.renderOrder = 3;
  }

  private funke(
    x: number,
    y: number,
    z: number,
    farbe: THREE.Color,
    streuung: number,
    hoch: number,
    groesse: number,
  ): void {
    const i = this.naechster;
    this.naechster = (this.naechster + 1) % VORRAT;
    this.lagen[i * 3] = x;
    this.lagen[i * 3 + 1] = y;
    this.lagen[i * 3 + 2] = z;
    this.farben[i * 3] = farbe.r;
    this.farben[i * 3 + 1] = farbe.g;
    this.farben[i * 3 + 2] = farbe.b;
    this.groessen[i] = groesse;
    this.tempo[i * 3] = (Math.random() - 0.5) * streuung;
    this.tempo[i * 3 + 1] = hoch + Math.random() * streuung * 0.5;
    this.tempo[i * 3 + 2] = (Math.random() - 0.5) * streuung;
    this.rest[i] = DAUER;
  }

  private readonly farbe = new THREE.Color();

  treffer(x: number, y: number, z: number, art: DamageType, abgeprallt: boolean): void {
    this.farbe.setHex(abgeprallt ? 0x9fb0c0 : FARBEN[art]);
    const anzahl = abgeprallt ? 3 : 7;
    for (let i = 0; i < anzahl; i++) this.funke(x, y, z, this.farbe, 2.2, 1.1, 1);
  }

  tod(x: number, y: number, z: number): void {
    this.farbe.setHex(0xd8cbb0);
    for (let i = 0; i < 14; i++) this.funke(x, y, z, this.farbe, 2.6, 1.6, 1.3);
  }

  stoerung(x: number, y: number, z: number): void {
    this.farbe.setHex(0xff6a6a);
    for (let i = 0; i < 9; i++) this.funke(x, y, z, this.farbe, 1.4, 2.4, 1);
  }

  durchbruch(x: number, y: number, z: number): void {
    this.farbe.setHex(0xff5a4a);
    for (let i = 0; i < 26; i++) this.funke(x, y, z, this.farbe, 3.4, 2.2, 1.6);
  }

  bossphase(x: number, y: number, z: number): void {
    this.farbe.setHex(0xffb44a);
    for (let i = 0; i < 30; i++) this.funke(x, y, z, this.farbe, 3.8, 1.2, 1.5);
  }

  blitz(vonX: number, vonY: number, vonZ: number, nachX: number, nachY: number, nachZ: number): void {
    const i = this.naechsterStrich;
    this.naechsterStrich = (this.naechsterStrich + 1) % Effekte3D.STRICHE;
    this.strichLagen.set([vonX, vonY, vonZ, nachX, nachY, nachZ], i * 6);
    this.strichRest[i] = 0.18;
  }

  leere(): void {
    this.rest.fill(0);
    this.strichRest.fill(0);
    this.groessen.fill(0);
    this.strichLagen.fill(0);
  }

  /** Bewegt alles weiter und laesst Abgelaufenes verschwinden. */
  aktualisiere(dt: number): void {
    for (let i = 0; i < VORRAT; i++) {
      const rest = this.rest[i] ?? 0;
      if (rest <= 0) {
        if ((this.groessen[i] ?? 0) !== 0) this.groessen[i] = 0;
        continue;
      }
      const neu = rest - dt;
      this.rest[i] = neu;
      if (neu <= 0) {
        this.groessen[i] = 0;
        continue;
      }
      this.lagen[i * 3] = (this.lagen[i * 3] ?? 0) + (this.tempo[i * 3] ?? 0) * dt;
      this.lagen[i * 3 + 1] = (this.lagen[i * 3 + 1] ?? 0) + (this.tempo[i * 3 + 1] ?? 0) * dt;
      this.lagen[i * 3 + 2] = (this.lagen[i * 3 + 2] ?? 0) + (this.tempo[i * 3 + 2] ?? 0) * dt;
      // Schwerkraft, damit die Funken fallen statt zu schweben.
      this.tempo[i * 3 + 1] = (this.tempo[i * 3 + 1] ?? 0) - 5.5 * dt;
      this.groessen[i] = (neu / DAUER) * 1.4;
    }
    this.punkte.geometry.attributes['position']!.needsUpdate = true;
    this.punkte.geometry.attributes['color']!.needsUpdate = true;
    this.punkte.geometry.attributes['size']!.needsUpdate = true;

    let sichtbar = false;
    for (let i = 0; i < Effekte3D.STRICHE; i++) {
      const rest = this.strichRest[i] ?? 0;
      if (rest <= 0) continue;
      const neu = rest - dt;
      this.strichRest[i] = neu;
      if (neu <= 0) this.strichLagen.fill(0, i * 6, i * 6 + 6);
      else sichtbar = true;
    }
    this.striche.visible = sichtbar;
    this.striche.geometry.attributes['position']!.needsUpdate = true;
  }
}
