/**
 * Einstiegspunkt.
 *
 * Stand Abschnitt 0 und 1: diese Seite beweist, dass die Werkzeugkette laeuft
 * und dass der Simulationskern auf dem Geraet rechnet. Sie ist noch nicht das
 * Spiel. Das Spielfeld entsteht in Abschnitt 2, siehe docs/04-fahrplan.md.
 */

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { selbsttest } from '@app/selbsttest';

const FARBE_HINTERGRUND = '#0d1117';
const FARBE_KLOTZ = 0x8fd694;
const FARBE_KLOTZ_DUNKEL = 0x4f8a55;
const FARBE_TEXT = 0xe6edf3;
const FARBE_GEDAEMPFT = 0x8b98a5;

async function start(): Promise<void> {
  const wurzel = document.getElementById('spielfeld');
  if (wurzel === null) throw new Error('Element spielfeld fehlt.');

  const app = new Application();
  await app.init({
    background: FARBE_HINTERGRUND,
    resizeTo: window,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  wurzel.appendChild(app.canvas);

  const buehne = new Container();
  app.stage.addChild(buehne);

  // Ein Klotz, der sich bewegt. Das Ergebnis von Abschnitt 0.
  const klotz = new Container();
  const koerper = new Graphics().rect(0, 0, 48, 48).fill(FARBE_KLOTZ);
  const schatten = new Graphics().rect(0, 40, 48, 8).fill(FARBE_KLOTZ_DUNKEL);
  klotz.addChild(koerper, schatten);
  buehne.addChild(klotz);

  const titelStil = new TextStyle({
    fill: FARBE_TEXT,
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: 'bold',
  });
  const zeilenStil = new TextStyle({ fill: FARBE_TEXT, fontFamily: 'monospace', fontSize: 14 });
  const labelStil = new TextStyle({ fill: FARBE_GEDAEMPFT, fontFamily: 'monospace', fontSize: 14 });

  const titel = new Text({ text: 'TowerDefender', style: titelStil });
  const untertitel = new Text({
    text: 'Abschnitt 0 und 1: Geruest und Simulationskern',
    style: labelStil,
  });
  buehne.addChild(titel, untertitel);

  const zeilen = selbsttest();
  const labels: Text[] = [];
  const werte: Text[] = [];
  for (const zeile of zeilen) {
    const label = new Text({ text: zeile.label, style: labelStil });
    const wert = new Text({ text: zeile.wert, style: zeilenStil });
    labels.push(label);
    werte.push(wert);
    buehne.addChild(label, wert);
  }

  const anordnen = (): void => {
    const rand = 24;
    titel.position.set(rand, rand);
    untertitel.position.set(rand, rand + 28);

    let y = rand + 64;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const wert = werte[i];
      if (label === undefined || wert === undefined) continue;
      label.position.set(rand, y);
      wert.position.set(rand + 110, y);
      y += 22;
    }
    // Der Klotz sitzt unter der Liste, auf kleinen Bildschirmen am Rand.
    klotz.position.y = Math.max(y + 48, Math.min(y + 96, app.screen.height - 48));
  };

  anordnen();
  app.renderer.on('resize', anordnen);

  let zeit = 0;
  app.ticker.add((ticker) => {
    zeit += ticker.deltaMS / 1000;
    const breite = Math.max(1, app.screen.width - 48);
    klotz.position.x = 24 + ((zeit * 120) % breite);
    // Eckige Drehung in Vierteln, passend zum Klotz-Stil.
    klotz.rotation = Math.floor(zeit * 2) * (Math.PI / 2);
    klotz.pivot.set(24, 24);
  });
}

void start();
