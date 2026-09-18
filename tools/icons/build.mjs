/**
 * Schreibt App-Symbol und Startbild in das Android-Projekt.
 *
 *   npm run icons
 *
 * Braucht ein vorhandenes android/ Verzeichnis. Das entsteht mit
 * `npx cap add android`.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 5198;
const RES = 'android/app/src/main/res';

if (!existsSync('android')) {
  console.error('Kein android/ Verzeichnis. Zuerst npx cap add android ausfuehren.');
  process.exit(1);
}

function starteServer() {
  const kind = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  return new Promise((resolve, reject) => {
    const abbruch = setTimeout(() => reject(new Error('Server startet nicht.')), 30000);
    kind.stdout.on('data', (block) => {
      if (String(block).includes('ready in') || String(block).includes('Local:')) {
        clearTimeout(abbruch);
        resolve(kind);
      }
    });
    kind.stderr.on('data', (block) => process.stderr.write(String(block)));
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
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const fehler = [];
  page.on('pageerror', (ausnahme) => fehler.push(String(ausnahme)));
  page.on('console', (nachricht) => {
    if (nachricht.type() === 'error') fehler.push(nachricht.text());
  });

  await page.goto(`http://localhost:${PORT}/tools/icons/index.html`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__FERTIG === true, { timeout: 120000 });
  if (fehler.length > 0) throw new Error(`Fehler beim Rendern:\n${fehler.join('\n')}`);

  const bilder = await page.evaluate(() => window.__SYMBOLE ?? []);
  for (const bild of bilder) {
    const ziel = bild.pfad === 'symbol-512.png' ? `public/${bild.pfad}` : `${RES}/${bild.pfad}`;
    await mkdir(dirname(ziel), { recursive: true });
    await writeFile(ziel, Buffer.from(bild.daten.split(',')[1], 'base64'));
  }
  console.log(`${bilder.length} Bilder geschrieben.`);
} finally {
  if (browser !== undefined) await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  process.exit(0);
}
