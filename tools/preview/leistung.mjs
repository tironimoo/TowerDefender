/**
 * Misst die Bildrate im Gefecht.
 *
 *   node tools/preview/leistung.mjs [levelNummer]
 *
 * Spielt eine Karte an, laesst bei dreifacher Geschwindigkeit laufen und misst
 * die Abstaende zwischen den Bildern. Gibt Mittelwert und schlechteste fuenf
 * Prozent aus. Siehe docs/03-architektur.md, Abschnitt Leistungsziele.
 */

import { chromium } from 'playwright';

// Ohne Grafikkarte im Pruefrechner muss WebGL in Software laufen. Seit die
// Darstellung raeumlich ist, faellt das sonst nicht auf einen langsamen
// Durchlauf zurueck, sondern auf ein schwarzes Bild.
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const levelNummer = Number.parseInt(process.argv[2] ?? '10', 10);

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: GL_ARGS });
const dpr = Number.parseFloat(process.argv[3] ?? '1');
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: dpr,
});

await page.addInitScript(() => {
  const sterne = {};
  for (let i = 1; i <= 10; i++) {
    sterne[`level-${String(i).padStart(2, '0')}`] = { normal: 3, hart: 3 };
  }
  window.localStorage.setItem(
    'towerdefender.spielstand',
    JSON.stringify({
      version: 1,
      splitter: 9000,
      ausgegeben: 0,
      forschung: [
        'arsenal-spaehturm',
        'arsenal-ambossfalle',
        'arsenal-balliste',
        'arsenal-kolbenstoss',
        'arsenal-blitzspule',
        'arsenal-netzwerfer',
        'arsenal-leuchtfeuer',
        'arsenal-alchemie',
      ],
      sterne,
      meisterschaft: {},
      loadouts: {},
      endlos: {},
      wochen: {},
      einstellungen: { ton: false, musik: false, vibration: false, tempo: 1 },
    }),
  );
  window.__bilder = [];
  const messen = () => {
    window.__bilder.push(performance.now());
    if (window.__bilder.length > 4000) window.__bilder.shift();
    requestAnimationFrame(messen);
  };
  requestAnimationFrame(messen);
});

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Spielen' }).click();
await page.waitForTimeout(400);
await page.locator('.eintrag').nth(levelNummer - 1).locator('button').first().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /Losgehen/ }).click();
await page.waitForTimeout(2200);

// So viel wie moeglich bauen, damit auch Geschosse und Partikel zaehlen.
for (let runde = 0; runde < 4; runde++) {
  const plaetze = await page.evaluate(() => window.__td.bauplaetze());
  for (const platz of plaetze) {
    if (platz.belegt || platz.x < 10 || platz.y < 60 || platz.x > 834 || platz.y > 320) continue;
    await page.mouse.click(platz.x, platz.y);
    const knopf = page.locator('.schweber .turmwahl button:not([disabled])').first();
    if ((await knopf.count()) > 0 && (await knopf.isVisible())) {
      await knopf.click({ force: true }).catch(() => undefined);
    }
  }
  await page.mouse.click(820, 110);
}

await page.getByRole('button', { name: /Welle starten/ }).click();
await page.getByRole('button', { name: '3x' }).click();

// Wellen stapeln, bis viel gleichzeitig unterwegs ist, aber nicht bis zur
// Niederlage: gemessen werden soll das Gefecht, nicht der Abspann.
let gipfel = 0;
for (let runde = 0; runde < 20; runde++) {
  await page.waitForTimeout(700);
  const zustand = await page.evaluate(() => window.__td.zustand());
  if (zustand.ansicht !== 'partie') break;
  gipfel = Math.max(gipfel, zustand.gegner);
  if (zustand.gegner > 110) break;
  const welle = page.getByRole('button', { name: /Naechste Welle/ });
  if ((await welle.count()) > 0 && (await welle.isEnabled())) {
    await welle.click({ force: true }).catch(() => undefined);
  }
}

await page.evaluate(() => {
  window.__bilder = [];
});
await page.waitForTimeout(5000);

const ergebnis = await page.evaluate(() => {
  const zeiten = window.__bilder;
  const abstaende = [];
  for (let i = 1; i < zeiten.length; i++) abstaende.push(zeiten[i] - zeiten[i - 1]);
  abstaende.sort((a, b) => a - b);
  const mittel = abstaende.reduce((s, w) => s + w, 0) / Math.max(1, abstaende.length);
  const p95 = abstaende[Math.floor(abstaende.length * 0.95)] ?? 0;
  return { bilder: abstaende.length, mittel, p95, zustand: window.__td.zustand() };
});

await browser.close();

console.log(`Bilder gemessen: ${ergebnis.bilder}`);
console.log(`Mittlerer Abstand: ${ergebnis.mittel.toFixed(2)} ms  (${(1000 / ergebnis.mittel).toFixed(0)} Bilder/s)`);
console.log(`Schlechteste 5 Prozent: ${ergebnis.p95.toFixed(2)} ms`);
console.log(`Zustand: ${JSON.stringify(ergebnis.zustand)}`);
console.log(`Hoechste Gegnerzahl: ${gipfel}`);
console.log(`Bildpunktdichte: ${dpr}`);
