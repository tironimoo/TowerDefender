/**
 * Schreibt die Voxelmodelle als JSON fuer den 3D-Renderer.
 *
 *   npm run modelle
 *
 * Der Sprite-Renderer in tools/voxel-render zeichnet dieselben Modelle flach
 * auf ein Canvas. Hier werden sie unveraendert ausgegeben, damit der
 * 3D-Renderer zur Laufzeit echte Koerper daraus bauen kann. Es gibt also
 * weiterhin nur eine Quelle fuer jedes Modell; nur die Ausgabe ist zweigleisig.
 *
 * Bewusst die Modelle selbst und keine fertige Geometrie: ein Kasten sind hier
 * sieben Zahlen, als Dreiecksnetz waeren es ueber zweihundert.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { BOSS_MODELS, CREATURE_MODELS } from '../voxel-render/models/creatures';
import { TOWER_MODELS } from '../voxel-render/models/towers';
import { PROJECTILE_MODELS, PROP_MODELS, TILE_MODELS } from '../voxel-render/models/welt';
import type { VoxelModel } from '../voxel-render/voxel';

const ZIEL = 'public/modelle';

const alle: readonly VoxelModel[] = [
  ...TILE_MODELS,
  ...PROP_MODELS,
  ...PROJECTILE_MODELS,
  ...TOWER_MODELS,
  ...CREATURE_MODELS,
  ...BOSS_MODELS,
];

const nachId = new Map<string, VoxelModel>();
for (const modell of alle) nachId.set(modell.id, modell);

let kaesten = 0;
for (const modell of nachId.values()) {
  for (const teil of modell.parts) kaesten += teil.boxes.length;
}

await mkdir(ZIEL, { recursive: true });
const inhalt = JSON.stringify({ modelle: Object.fromEntries(nachId) });
await writeFile(`${ZIEL}/modelle.json`, inhalt);

console.log(
  `${nachId.size} Modelle mit ${kaesten} Kaesten, ` +
    `${(inhalt.length / 1024).toFixed(0)} KB nach public/modelle/modelle.json.`,
);
