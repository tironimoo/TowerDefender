/**
 * Tilt-Shift: der Trick, der aus einer Szene ein Modell macht.
 *
 * Ein echtes Objektiv hat nur eine schmale scharfe Ebene. Bei einer Landschaft
 * faellt das nicht auf, weil alles weit weg ist - bei einem Modell auf dem
 * Tisch dagegen sofort. Genau deshalb liest das Auge eine Szene mit schmaler
 * Schaerfeebene als "klein und nah" statt "gross und fern".
 *
 * Gerechnet wird kein echter Zerstreuungskreis, sondern eine Unschaerfe, die
 * mit dem Abstand von einem waagerechten Band waechst. Das kostet zwei
 * Durchgaenge statt eines Tiefenpuffers und sieht auf einem Handy genauso aus.
 */

import * as THREE from 'three';

export const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    /** Bildpunkte je Achse, fuer die Schrittweite. */
    aufloesung: { value: new THREE.Vector2(1, 1) },
    /** Hoehe der scharfen Ebene, 0 unten bis 1 oben. */
    mitte: { value: 0.5 },
    /** Halbe Hoehe des scharfen Bandes. */
    breite: { value: 0.22 },
    /** Staerke der Unschaerfe in Bildpunkten. */
    staerke: { value: 3.0 },
    /** 0 waagerecht, 1 senkrecht. Zwei Durchgaenge ergeben eine runde Unschaerfe. */
    senkrecht: { value: 0 },
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
    uniform vec2 aufloesung;
    uniform float mitte;
    uniform float breite;
    uniform float staerke;
    uniform float senkrecht;
    varying vec2 vUv;

    void main() {
      // Abstand vom scharfen Band, sanft ansteigend.
      float abstand = max(0.0, abs(vUv.y - mitte) - breite) / max(0.001, 1.0 - breite);
      float unschaerfe = smoothstep(0.0, 1.0, abstand) * staerke;

      if (unschaerfe < 0.01) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 schritt = (senkrecht > 0.5 ? vec2(0.0, 1.0) : vec2(1.0, 0.0)) / aufloesung * unschaerfe;
      // Neun Abtastungen mit Gauss-Gewichten. Mehr sieht man auf einem Handy nicht.
      vec4 summe = texture2D(tDiffuse, vUv) * 0.2270270270;
      summe += texture2D(tDiffuse, vUv + schritt * 1.3846153846) * 0.3162162162;
      summe += texture2D(tDiffuse, vUv - schritt * 1.3846153846) * 0.3162162162;
      summe += texture2D(tDiffuse, vUv + schritt * 3.2307692308) * 0.0702702703;
      summe += texture2D(tDiffuse, vUv - schritt * 3.2307692308) * 0.0702702703;
      gl_FragColor = summe;
    }
  `,
};
