/**
 * Macht aus dem gebauten dist/ eine installierbare Webfassung.
 *
 *   node tools/web/pwa.mjs [fassung]
 *
 * Setzt die Fassungsnummer und die Dateilisten in dist/sw.js ein. Die Nummer
 * entscheidet ueber den Namen des Ablagefachs: eine neue Nummer heisst neues
 * Fach, und damit werden beim naechsten Start alle Dateien neu geholt - auch
 * die, deren Name gleich geblieben ist.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

const ORDNER = 'dist';
const fassung = process.argv[2] ?? process.env.FASSUNG ?? String(Date.now());

/** Alle Dateien unter dist, als Pfade relativ zu dist mit Schraegstrichen. */
async function sammle(ordner) {
  const heraus = [];
  for (const eintrag of await readdir(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) heraus.push(...(await sammle(pfad)));
    else heraus.push(relative(ORDNER, pfad).split(sep).join(posix.sep));
  }
  return heraus;
}

const alle = (await sammle(ORDNER)).filter((p) => p !== 'sw.js' && !p.endsWith('.map'));

// Das Geruest ist alles, was das Spiel zum Starten braucht: die Seite selbst,
// die gebauten Skripte und Stile, das Symbol und die Uebersicht der Blaetter.
// Der Prototyp des neuen Stils und die 3D-Bibliothek gehoeren nicht ins
// Geruest: sonst laedt jeder Spieler beim ersten Aufruf ein halbes Megabyte
// fuer eine Seite mit, die er vielleicht nie oeffnet.
const nurAufAbruf = (p) => p.startsWith('prototyp/') || p.startsWith('modelle/') || /three/i.test(p);

const geruest = alle.filter(
  (p) =>
    !nurAufAbruf(p) &&
    (p === 'index.html' ||
      p === 'manifest.webmanifest' ||
      p === 'symbol-512.png' ||
      p === 'atlas/index.json' ||
      p.startsWith('assets/')),
);
const rest = alle.filter((p) => !geruest.includes(p));

// Gelesen wird immer die Vorlage, nicht das Ergebnis eines frueheren Laufs.
// Sonst liesse sich das Werkzeug kein zweites Mal auf denselben Bau anwenden.
const ziel = join(ORDNER, 'sw.js');
let quelle = await readFile(join('public', 'sw.js'), 'utf8');
for (const [platzhalter, wert] of [
  ['__FASSUNG__', fassung],
  ['__GERUEST__', JSON.stringify(geruest, null, 2)],
  ['__REST__', JSON.stringify(rest, null, 2)],
]) {
  if (!quelle.includes(platzhalter)) {
    console.error(`Platzhalter ${platzhalter} fehlt in ${ziel}.`);
    process.exit(1);
  }
  quelle = quelle.replaceAll(platzhalter, wert);
}
await writeFile(ziel, quelle);

let bytes = 0;
for (const pfad of alle) bytes += (await stat(join(ORDNER, pfad))).size;
console.log(
  `Webfassung ${fassung}: ${geruest.length} Dateien im Geruest, ` +
    `${rest.length} nachgelagert, ${(bytes / 1024 / 1024).toFixed(2)} MB gesamt.`,
);
