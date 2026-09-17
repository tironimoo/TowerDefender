/**
 * Farbpaletten der drei Regionen.
 *
 * Die Paletten ueberschneiden sich absichtlich kaum. Dadurch sind die Regionen
 * schon auf einem Vorschaubild zu unterscheiden. Siehe docs/01-konzept.md.
 */

export const WALD = {
  gras: '#5b8c3e',
  grasHell: '#6fa34c',
  erde: '#7a5a37',
  erdeDunkel: '#5d4429',
  stein: '#7d8189',
  rinde: '#5a4228',
  laub: '#3f7a35',
  moos: '#4a6b33',
  knochen: '#e4dfc9',
  eisen: '#9aa4ae',
  wasser: '#3a6ea5',
  augenGelb: '#ffcf6b',
} as const;

export const GLUT = {
  basalt: '#39323f',
  basaltHell: '#4a4251',
  asche: '#6b6570',
  magma: '#ff6a2a',
  glut: '#ffb347',
  lava: '#e04a12',
  eisenDunkel: '#4f4857',
  russ: '#241f29',
} as const;

export const LEERE = {
  stein: '#2e2447',
  steinHell: '#3d3159',
  obsidian: '#1b1430',
  amethyst: '#8b5cf6',
  amethystHell: '#c4b5fd',
  schimmer: '#a78bfa',
  nebel: '#4c3f70',
} as const;

export const GEMEINSAM = {
  holz: '#8a6234',
  holzDunkel: '#63451f',
  stein: '#8b9098',
  steinDunkel: '#63686f',
  eisen: '#a8b2bd',
  gold: '#e6b84a',
  eis: '#9fd8f0',
  eisHell: '#d6f1ff',
  netz: '#dfe6ea',
  kupfer: '#c07a4a',
  glasGruen: '#6fd6a0',
} as const;
