/**
 * Baut die Sprite-Blaetter.
 *
 * Startet den Entwicklungsserver, laesst die Renderseite in einem echten
 * Browser alle Modelle zeichnen und schreibt die Ergebnisse nach public/atlas.
 *
 *   npm run assets
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 5199;
const ZIEL = 'public/atlas';

function starteServer() {
  // Eigene Prozessgruppe, damit sich der Server am Ende zuverlaessig beenden
  // laesst. Ohne das haengt der Bau nach dem Schreiben der Dateien.
  const kind = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  return new Promise((resolve, reject) => {
    const abbruch = setTimeout(() => reject(new Error('Server startet nicht.')), 30000);
    kind.stdout.on('data', (datenblock) => {
      if (String(datenblock).includes('ready in') || String(datenblock).includes('Local:')) {
        clearTimeout(abbruch);
        resolve(kind);
      }
    });
    kind.stderr.on('data', (datenblock) => process.stderr.write(String(datenblock)));
    kind.on('exit', (code) => {
      clearTimeout(abbruch);
      reject(new Error(`Server beendet mit Code ${code}.`));
    });
  });
}

const server = await starteServer();
let browser;

try {
  browser = await chromium.launch({ executablePath: EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const fehler = [];
  page.on('pageerror', (ausnahme) => fehler.push(String(ausnahme)));
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(nachricht.text());
  });

  await page.goto(`http://localhost:${PORT}/tools/voxel-render/index.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__FERTIG === true, { timeout: 600000 });

  if (fehler.length > 0) {
    throw new Error(`Fehler beim Rendern:\n${fehler.join('\n')}`);
  }

  const ergebnisse = await page.evaluate(() =>
    (window.__ATLAS ?? []).map((eintrag) => ({ blatt: eintrag.blatt, daten: eintrag.daten })),
  );

  await rm(ZIEL, { recursive: true, force: true });
  await mkdir(ZIEL, { recursive: true });

  let gesamtBytes = 0;
  for (const eintrag of ergebnisse) {
    const rohdaten = Buffer.from(eintrag.daten.split(',')[1], 'base64');
    gesamtBytes += rohdaten.length;
    await writeFile(`${ZIEL}/${eintrag.blatt.bild}`, rohdaten);
    await writeFile(`${ZIEL}/${eintrag.blatt.name}.json`, JSON.stringify(eintrag.blatt));
  }

  const index = {
    erzeugt: new Date().toISOString().slice(0, 10),
    kachelBreite: 64,
    kachelHoehe: 32,
    richtungen: 8,
    laufbilder: 4,
    blaetter: ergebnisse.map((eintrag) => eintrag.blatt.name).sort(),
  };
  await writeFile(`${ZIEL}/index.json`, JSON.stringify(index, null, 2));

  console.log(`${ergebnisse.length} Blaetter geschrieben, ${(gesamtBytes / 1024 / 1024).toFixed(2)} MB.`);
} finally {
  if (browser !== undefined) await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  // Node haelt sonst wegen der offenen Rohre des Kindprozesses offen.
  process.exit(0);
}
