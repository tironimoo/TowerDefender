/**
 * Bildschirmfoto der laufenden Vorschau.
 *
 * Prueft, dass die Seite in einem echten Browser ohne Fehler rendert.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node tools/preview/shot.mjs bild.png [pfad] [breite] [hoehe]
 */


import { chromium } from 'playwright';

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const ziel = process.argv[2] ?? 'bildschirmfoto.png';
const pfad = process.argv[3] ?? '/';
const breite = Number.parseInt(process.argv[4] ?? '844', 10);
const hoehe = Number.parseInt(process.argv[5] ?? '390', 10);

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const page = await browser.newPage({
  viewport: { width: breite, height: hoehe },
  deviceScaleFactor: 2,
});

const fehler = [];
page.on('console', (nachricht) => {
  if (nachricht.type() === 'error') fehler.push(nachricht.text());
});
page.on('pageerror', (ausnahme) => fehler.push(String(ausnahme)));

await page.goto(`http://localhost:4173${pfad}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: ziel });
await browser.close();

if (fehler.length > 0) {
  console.error('Fehler in der Konsole:\n' + fehler.join('\n'));
  process.exit(1);
}
console.log(`Bild gespeichert: ${ziel}`);
