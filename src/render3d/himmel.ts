/**
 * Der Hintergrund als Farbverlauf.
 *
 * Eine einfarbige Flaeche hinter dem Modell liest sich als leeres Fenster.
 * Ein Verlauf liest sich als Raum: oben kuehler und dunkler, unten waermer,
 * mit einem weichen Schimmer knapp ueber der Inselhoehe, wie die Aufhellung
 * einer Hohlkehle im Aufnahmestudio.
 *
 * Gerechnet auf einer grossen Kugel von innen. Sie schreibt nicht in den
 * Tiefenpuffer und steht damit immer ganz hinten, egal wie weit die Kamera
 * herausfaehrt.
 */

import * as THREE from 'three';

export interface Himmel {
  readonly netz: THREE.Mesh;
  readonly setze: (oben: string, unten: string, schimmer: string) => void;
}

export function baueHimmel(radius = 180): Himmel {
  const uniformen = {
    oben: { value: new THREE.Color('#0a1018') },
    unten: { value: new THREE.Color('#1c1610') },
    schimmer: { value: new THREE.Color('#2e3c4e') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniformen,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vOrt;
      void main() {
        vOrt = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 oben;
      uniform vec3 unten;
      uniform vec3 schimmer;
      varying vec3 vOrt;
      void main() {
        float h = normalize(vOrt).y;
        vec3 farbe = mix(unten, oben, smoothstep(-0.45, 0.65, h));
        // Der Schimmer sitzt knapp ueber dem Horizont, wo bei einer echten
        // Hohlkehle die Aufhellung liegt.
        farbe += schimmer * exp(-pow((h - 0.02) * 6.5, 2.0)) * 0.55;
        gl_FragColor = vec4(farbe, 1.0);
      }
    `,
  });

  const netz = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  netz.frustumCulled = false;
  netz.renderOrder = -1;

  return {
    netz,
    setze: (oben, unten, schimmer): void => {
      uniformen.oben.value.set(oben);
      uniformen.unten.value.set(unten);
      uniformen.schimmer.value.set(schimmer);
    },
  };
}
