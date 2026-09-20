/**
 * Spielt eine Karte von Anfang bis Ende und macht Bilder.
 *
 *   node tools/preview/durchlauf.mjs <zielordner> [levelNummer]
 *
 * Baut ueber den Zugang aus app/spiel.ts auf echten Bauplaetzen, laesst in
 * dreifacher Geschwindigkeit laufen und haelt Ergebnis, Forschung und
 * Meisterschaft fest. Dient der Sichtpruefung des ganzen Ablaufs.
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
await page.waitForTimeout(1000);

await page.getByRole('button', { name: 'Spielen' }).click();
await page.waitForTimeout(400);
const karte = page.locator('.eintrag').nth(levelNummer - 1);
await karte.locator('button').first().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /Losgehen/ }).click();
await page.waitForTimeout(2200);

function imBild(platz) {
  return platz.x > 10 && platz.y > 60 && platz.x < 834 && platz.y < 320;
}

/** Baut auf allen freien Plaetzen, solange Gold reicht. */
async function baueWasGeht() {
  const plaetze = await page.evaluate(() => window.__td.bauplaetze());
  for (const platz of plaetze) {
    if (platz.belegt || platz.aufWeg || !imBild(platz)) continue;
    await page.mouse.click(platz.x, platz.y);
    await page.waitForTimeout(80);
    const knopf = page.locator('.schweber .turmwahl button:not([disabled])').first();
    if ((await knopf.count()) > 0 && (await knopf.isVisible())) {
      await knopf.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(80);
    } else {
      break;
    }
  }
  await page.mouse.click(820, 110);
}

/** Baut vorhandene Tuerme aus, solange Gold reicht. */
async function baueAus() {
  const plaetze = await page.evaluate(() => window.__td.bauplaetze());
  for (const platz of plaetze) {
    if (!platz.belegt || !imBild(platz)) continue;
    await page.mouse.click(platz.x, platz.y);
    await page.waitForTimeout(80);
    const knopf = page.locator('.schweber button:not([disabled])').filter({ hasText: 'Ausbauen' });
    if ((await knopf.count()) > 0 && (await knopf.first().isVisible())) {
      await knopf.first().click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(80);
    }
  }
  await page.mouse.click(820, 110);
}

await baueWasGeht();
await page.screenshot({ path: `${ziel}/a-aufbau.png` });

await page.getByRole('button', { name: /Welle starten/ }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '3x' }).click();

let bossBild = false;
// Nachbauen, und die naechste Welle nur vorziehen, wenn Luft ist.
for (let runde = 0; runde < 120; runde++) {
  await page.waitForTimeout(1200);
  const zustand = await page.evaluate(() => window.__td.zustand());
  if (zustand.ansicht === 'ergebnis') break;
  await baueWasGeht();
  await baueAus();
  if (zustand.gegner <= 2 && zustand.welle === zustand.abgeraeumt) {
    const welle = page.getByRole('button', { name: /Naechste Welle/ });
    if ((await welle.count()) > 0 && (await welle.isEnabled())) {
      await welle.click().catch(() => undefined);
    }
  }
  if (runde === 10) await page.screenshot({ path: `${ziel}/b-gefecht.png` });
  if (zustand.boss && !bossBild) {
    bossBild = true;
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${ziel}/b2-boss.png` });
  }
}

await page.waitForTimeout(1200);
await page.screenshot({ path: `${ziel}/c-ergebnis.png` });

const zustand = await page.evaluate(() => window.__td.zustand());
console.log('Zustand am Ende:', JSON.stringify(zustand));

// Zurueck ins Menue und die Uebersichten zeigen.
async function klicke(name) {
  const knopf = page.getByRole('button', { name }).first();
  if ((await knopf.count()) === 0) return false;
  await knopf.click().catch(() => undefined);
  await page.waitForTimeout(450);
  return true;
}

await klicke('Karten');
await page.screenshot({ path: `${ziel}/d-karten.png` });

await klicke('Zurueck');
await klicke('Forschung');
await page.screenshot({ path: `${ziel}/e-forschung.png` });

await klicke('Zurueck');
await klicke('Meisterschaft');
await page.screenshot({ path: `${ziel}/f-meisterschaft.png` });

await browser.close();

if (fehler.length > 0) {
  console.error('Fehler in der Konsole:\n' + fehler.join('\n'));
  process.exit(1);
}
console.log(`Bilder in ${ziel}`);
