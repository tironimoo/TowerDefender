/**
 * Macht aus glatten Flaechen Knete.
 *
 * Ein Standardmaterial sieht immer nach Kunststoff aus, und zwar aus einem
 * einzigen Grund: seine Oberflaeche ist mathematisch perfekt. Echte Knete ist
 * das nie. Sie hat Daumenabdruecke, kleine Diebstellen, eine Oberflaeche, die
 * das Licht an jeder Stelle etwas anders zurueckwirft.
 *
 * Genau das wird hier in den Schattierer geschoben, ohne eine einzige Textur:
 *
 *  - Ein Rauschen im Modellraum verbiegt die Normale leicht. Das sind die
 *    Dellen. Weil es im Modellraum liegt und nicht im Bildraum, wandert es
 *    nicht ueber die Figur, wenn sie laeuft.
 *  - Ein zweites, groeberes Rauschen gibt die Handballenflaechen: breite
 *    weiche Beulen, wie von Fingern gedrueckt.
 *  - Ein Randleuchten taeuscht vor, dass Licht ein Stueck weit in das
 *    Material eindringt. Knete ist leicht durchscheinend; ohne diesen Term
 *    wirken die Kanten tot.
 *
 * Alle Regler haengen an gemeinsamen Uniform-Objekten. Ein Schieberegler
 * aendert damit jedes Material auf einmal, ohne dass etwas neu uebersetzt
 * werden muss.
 */

import * as THREE from 'three';

/** Gemeinsame Stellwerte aller Knetmaterialien. */
export const knetWerte = {
  korn: { value: 0.55 },
  kornFeinheit: { value: 26.0 },
  beulen: { value: 0.45 },
  rand: { value: 0.35 },
  kehle: { value: 1.0 },
  randFarbe: { value: new THREE.Color('#ffb98a') },
};

/**
 * Wertrauschen und seine Ableitung.
 *
 * Bewusst kein Simplex: das hier ist ein paar Zeilen lang, laeuft auf jedem
 * Telefon-Grafikchip und sieht bei dieser Koernung nicht anders aus.
 */
const RAUSCHEN = /* glsl */ `
float knetHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float knetRauschen(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(knetHash(i + vec3(0,0,0)), knetHash(i + vec3(1,0,0)), f.x),
        mix(knetHash(i + vec3(0,1,0)), knetHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(knetHash(i + vec3(0,0,1)), knetHash(i + vec3(1,0,1)), f.x),
        mix(knetHash(i + vec3(0,1,1)), knetHash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

// Gefaelle des Rauschens. Vier Abtastungen: die Normale soll sich in die
// Richtung neigen, in die das Material abfaellt - das ist eine Delle.
vec3 knetGefaelle(vec3 p, float weite) {
  float mitte = knetRauschen(p);
  vec2 e = vec2(weite, 0.0);
  return vec3(
    knetRauschen(p + e.xyy) - mitte,
    knetRauschen(p + e.yxy) - mitte,
    knetRauschen(p + e.yyx) - mitte) / weite;
}
`;

/**
 * Haengt die Knetoberflaeche an ein Standardmaterial.
 *
 * Das Material bleibt ein MeshStandardMaterial: Schatten, Nebel, Tonwertkurve
 * und alles andere aus three funktioniert weiter. Nur die Normale und ein
 * Randterm kommen dazu.
 */
export function machKnete(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (schattierer) => {
    schattierer.uniforms['knetKorn'] = knetWerte.korn;
    schattierer.uniforms['knetFeinheit'] = knetWerte.kornFeinheit;
    schattierer.uniforms['knetBeulen'] = knetWerte.beulen;
    schattierer.uniforms['knetRand'] = knetWerte.rand;
    schattierer.uniforms['knetRandFarbe'] = knetWerte.randFarbe;
    schattierer.uniforms['knetKehle'] = knetWerte.kehle;

    schattierer.vertexShader = schattierer.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vKnetOrt;\nattribute float abschattung;\nvarying float vKehle;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vKnetOrt = transformed;\n  vKehle = abschattung;',
      );

    schattierer.fragmentShader = schattierer.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vKnetOrt;
varying float vKehle;
uniform float knetKehle;
uniform float knetKorn;
uniform float knetFeinheit;
uniform float knetBeulen;
uniform float knetRand;
uniform vec3 knetRandFarbe;
${RAUSCHEN}`,
      )
      // Nach normal_fragment_begin steht die endgueltige Normale in "normal".
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
{
  vec3 fein = knetGefaelle(vKnetOrt * knetFeinheit, 0.35);
  vec3 grob = knetGefaelle(vKnetOrt * (knetFeinheit * 0.17), 0.35);
  normal = normalize(normal - fein * knetKorn * 0.03 - grob * knetBeulen * 0.12);
}`,
      )
      // Randleuchten als Eigenleuchten: so laeuft es durch dieselbe
      // Tonwertkurve wie alles andere und kann nicht ueberstrahlen.
      // Gebackene Kehlen: sie sitzen vor der Beleuchtung, damit sie auch das
      // Fuelllicht daempfen. Danach angewandt wuerde jede Kehle im Gegenlicht
      // wieder aufgehen, und genau dort braucht man sie am meisten.
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  diffuseColor.rgb *= mix(1.0, vKehle, knetKehle);`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
  vec3 zumAuge = normalize(vViewPosition);
  float saum = pow(1.0 - clamp(dot(zumAuge, normal), 0.0, 1.0), 2.2);
  totalEmissiveRadiance += knetRandFarbe * diffuseColor.rgb * saum * knetRand;
}
#include <opaque_fragment>`,
      );
  };
  // Zwingt three, den Schattierer als eigene Fassung zu fuehren.
  material.customProgramCacheKey = (): string => 'knete';
  return material;
}
