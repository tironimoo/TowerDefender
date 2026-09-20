/**
 * Fuehrt das Spiel im Browser vor und macht Bilder.
 *
 *   node tools/preview/spiele.mjs <zielordner> [levelNummer] [sekunden]
 *
 * Klickt sich durch Menue, Kartenwahl und Loadout, spielt eine Weile und legt
 * Bilder ab. Dient der Sichtpruefung, nicht als Test.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Ohne Grafikkarte im Pruefrechner muss WebGL in Software laufen. Seit die
// Darstellung raeumlich ist, faellt das sonst nicht auf einen langsamen
// Durchlauf zurueck, sondern auf ein schwarzes Bild.
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ziel = process.argv[2] ?? '.';
const levelNummer = Number.parseInt(process.argv[3] ?? '1', 10);
const sekunden = Number.parseInt(process.argv[4] ?? '25', 10);

await mkdir(ziel, { recursive: true });

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: GL_ARGS });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });

const fehler = [];
page.on('pageerror', (ausnahme) => fehler.push(String(ausnahme)));
page.on('console', (nachricht) => {
  if (nachricht.type() === 'error') fehler.push(nachricht.text());
});

// Fuer die Sichtpruefung alles freischalten. Betrifft nur diesen Browser.
if (process.argv.includes('--alles') || levelNummer > 1) {
  await page.addInitScript(() => {
    const sterne = {};
    for (let i = 1; i <= 10; i++) {
      sterne[`level-${String(i).padStart(2, '0')}`] = { normal: 3, hart: 3 };
    }
    window.localStorage.setItem(
      'towerdefender.spielstand',
      JSON.stringify({
        version: 1,
        splitter: 5000,
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
        einstellungen: { ton: false, musik: false, vibration: false, tempo: 1 },
      }),
    );
  });
}

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: 'Spielen' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${ziel}/02-karten.png` });

// Auf der gewaehlten Karte die Schwierigkeit Normal waehlen.
const karten = page.locator('.eintrag');
const karte = karten.nth(levelNummer - 1);
await karte.locator('button').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${ziel}/03-loadout.png` });

await page.getByRole('button', { name: /Losgehen/ }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${ziel}/04-bauphase.png` });

// Einen Bauplatz antippen, damit das Baumenue zu sehen ist.
await page.mouse.click(422, 210);
await page.waitForTimeout(400);
await page.screenshot({ path: `${ziel}/05-baumenue.png` });

/** Tippt auf eine Stelle und baut dort, wenn ein Bauplatz getroffen wurde. */
async function baueBei(x, y) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(220);
  const knopf = page.locator('.schweber .turmwahl button:not([disabled])').first();
  if ((await knopf.count()) > 0 && (await knopf.isVisible())) {
    await knopf.click();
    await page.waitForTimeout(220);
  }
}

for (const [x, y] of [
  [422, 210],
  [330, 250],
  [500, 300],
  [620, 200],
  [700, 320],
  [380, 330],
]) {
  await baueBei(x, y);
}
await page.mouse.click(820, 110);
await page.waitForTimeout(200);

await page.getByRole('button', { name: /Welle starten/ }).click();
await page.waitForTimeout((sekunden * 1000) / 2);
await page.screenshot({ path: `${ziel}/06-gefecht.png` });
await page.waitForTimeout((sekunden * 1000) / 2);
await page.screenshot({ path: `${ziel}/07-gefecht2.png` });

await browser.close();

if (fehler.length > 0) {
  console.error('Fehler in der Konsole:\n' + fehler.join('\n'));
  process.exit(1);
}
console.log(`Bilder in ${ziel}`);
