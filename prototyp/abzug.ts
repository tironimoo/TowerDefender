/**
 * Der letzte Durchgang: aus einem Renderbild ein Foto machen.
 *
 * Ein gerendertes Bild ist zu sauber. Es hat gleichmaessige Farben bis in die
 * Ecken, keine Koernung, keinen Farbstich. Genau daran erkennt das Auge in
 * Sekundenbruchteilen "Computer". Vier kleine Eingriffe drehen das um:
 *
 *  - Abschattung zum Rand, wie sie jedes Objektiv hat.
 *  - Geteilte Toenung: Lichter warm, Schatten kuehl. Das ist der Griff, mit
 *    dem in jedem Film die Stimmung gemacht wird.
 *  - Koernung, leicht und in Bewegung. Sie hat keine Aufgabe ausser der
 *    einen: sie sagt "aufgenommen" statt "gerechnet".
 *  - Kontrast und Saettigung als Feinschliff.
 */

import * as THREE from 'three';

export const AbzugShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    /** Laeuft mit, damit die Koernung nicht steht. */
    zeit: { value: 0 },
    /** Staerke der Randabschattung. */
    abschattung: { value: 0.55 },
    /** Staerke der Koernung. */
    koernung: { value: 0.09 },
    /** Unter 1 flauer, ueber 1 harter. */
    kontrast: { value: 1.12 },
    /** 0 grau, 1 unveraendert, darueber bunter. */
    saettigung: { value: 1.14 },
    /** Farbe der Lichter. */
    lichterTon: { value: new THREE.Color('#ffd9a8') },
    /** Farbe der Schatten. */
    schattenTon: { value: new THREE.Color('#5a78b4') },
    /** Wie stark die geteilte Toenung wirkt. */
    toenung: { value: 0.28 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float zeit;
    uniform float abschattung;
    uniform float koernung;
    uniform float kontrast;
    uniform float saettigung;
    uniform vec3 lichterTon;
    uniform vec3 schattenTon;
    uniform float toenung;
    varying vec2 vUv;

    float streu(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 bild = texture2D(tDiffuse, vUv);
      vec3 farbe = bild.rgb;

      // Geteilte Toenung ueber die Helligkeit.
      float helligkeit = dot(farbe, vec3(0.2126, 0.7152, 0.0722));
      vec3 ton = mix(schattenTon, lichterTon, smoothstep(0.15, 0.85, helligkeit));
      farbe = mix(farbe, farbe * ton * 1.35, toenung);

      farbe = (farbe - 0.5) * kontrast + 0.5;
      float grau = dot(farbe, vec3(0.2126, 0.7152, 0.0722));
      farbe = mix(vec3(grau), farbe, saettigung);

      // Abschattung: quadratischer Abfall zum Rand, nicht linear - sonst
      // sieht man den Kreis.
      vec2 mitte = vUv - 0.5;
      float rand = 1.0 - dot(mitte, mitte) * 1.6;
      farbe *= mix(1.0, clamp(rand, 0.0, 1.0), abschattung);

      // Koernung auf die Helligkeit, nicht auf die Farbe: buntes Rauschen
      // sieht nach kaputtem Bildschirm aus, nicht nach Film.
      // Feines Korn: an die Bildpunkte gekoppelt, nicht an die Bildgroesse,
      // damit es auf einem hochaufloesenden Schirm nicht zu Grieben wird.
      float korn = streu(gl_FragCoord.xy * 0.37 + fract(zeit) * 137.0) - 0.5;
      farbe += korn * koernung * (0.4 + 0.6 * (1.0 - helligkeit));

      gl_FragColor = vec4(clamp(farbe, 0.0, 1.0), bild.a);
    }
  `,
};
