/**
 * Hoehle und Burg: die beiden Orte, an denen der Weg anfaengt und aufhoert.
 *
 * Ohne sie erscheinen die Gegner aus dem Nichts und verschwinden ins Nichts,
 * und die Karte hat keine Richtung. Mit ihnen wird aus dem Weg eine
 * Geschichte: dort kommen sie heraus, dorthin wollen sie.
 *
 * Die Burg hat vier Zustaende. Sie sind nicht Zierde, sondern Anzeige: wer
 * auf die Leben in der Leiste schauen muss, um zu wissen wie es steht, hat
 * den Blick nicht auf dem Spiel. Eine Burg, der die Tuerme wegbrechen, sagt
 * dasselbe, ohne dass man den Kopf hebt.
 */

import type { RohKasten, RohModell } from './meshbau';

/**
 * Die Hoehle.
 *
 * Der Eingang zeigt nach +z, also in Laufrichtung der Gegner. Das Dunkel
 * darin ist kein Loch in der Geometrie, sondern ein fast schwarzer Koerper,
 * der ein Stueck zurueckgesetzt sitzt. Ein echtes Loch waere von der Seite
 * als Kulisse zu erkennen; so ist es von jeder Seite eine Hoehle.
 */
const HOEHLE: RohModell = {
  id: 'bau_hoehle',
  parts: [
    // Der Fels und das Dunkel darin sind zwei Teile, und das ist kein
    // Aufraeumen, sondern noetig: der Huellenbau verschmilzt nur innerhalb
    // eines Teils. Waeren sie eins, wuerde das Schwarz in den Stein
    // hineinbluten und aus der Hoehle ein dunkler Klumpen.
    //
    // Der Fels muss das Dunkel ausserdem vollstaendig umschliessen. Beim
    // ersten Anlauf war der Schlund tiefer als der Fels und stand hinten und
    // vorn als schwarzer Ziegel heraus.
    {
      name: 'fels',
      pivot: [0, 0, 0],
      boxes: [
        // Zwei Wangen, ein Sturz, eine Rueckwand: daraus liest das Auge ein
        // Tor. Eine Kuppel mit Delle davor liest es als Stein mit Delle.
        { pos: [-12, 12, 0], size: [13, 24, 21], color: '#7b7266', grain: 0.14 },
        { pos: [12, 11, 0], size: [12, 22, 20], color: '#6e6559', grain: 0.14 },
        { pos: [0, 22, 0], size: [31, 9, 20], color: '#847a6c', grain: 0.13 },
        { pos: [0, 12, -11], size: [31, 24, 9], color: '#756c60', grain: 0.14 },
        { pos: [0, 28, -2], size: [26, 11, 18], color: '#8b8172', art: 'ei', grain: 0.13 },
        { pos: [-17, 7, -4], size: [12, 15, 14], color: '#6a6256', art: 'ei', grain: 0.15 },
        { pos: [16, 6, -5], size: [11, 13, 13], color: '#756c60', art: 'ei', grain: 0.15 },
        // Moos auf dem Sturz. Ohne etwas Gruen bleibt die Hoehle aus der
        // Entfernung ein grauer Kasten wie jeder andere.
        { pos: [-5, 28, 5], size: [14, 6, 9], color: '#5d7a42', art: 'ei', grain: 0.18 },
        { pos: [8, 27, 4], size: [10, 5, 8], color: '#688748', art: 'ei', grain: 0.18 },
        { pos: [-18, 13, 2], size: [8, 7, 7], color: '#55703c', art: 'ei', grain: 0.18 },
        { pos: [-11, 1.5, 14], size: [10, 4, 8], color: '#5f574d', art: 'ei', grain: 0.13 },
        { pos: [11, 1.2, 15], size: [9, 3.5, 7], color: '#6b6257', art: 'ei', grain: 0.13 },
        { pos: [-17, 5, 11], size: [3.4, 9, 3.4], color: '#5f574d', art: 'wurst', achse: 'y' },
        { pos: [17, 4.5, 12], size: [3.2, 8, 3.2], color: '#5f574d', art: 'wurst', achse: 'y' },
      ],
    },
    {
      name: 'schlund',
      pivot: [0, 0, 0],
      boxes: [
        { pos: [0, 9, -1], size: [12, 17, 16], color: '#15120f', grain: 0.04 },
        { pos: [0, 8, -6], size: [9, 13, 8], color: '#0a0908', grain: 0.03 },
      ],
    },
    {
      name: 'glimmen',
      pivot: [0, 0, 0],
      bob: { amp: 0.3, phase: 0 },
      boxes: [
        { pos: [-2.6, 8, -3], size: [2.4, 2.4, 2.4], color: '#ff9a4a', art: 'ei', glow: 1.3 },
        { pos: [2.8, 7.4, -4], size: [2.1, 2.1, 2.1], color: '#ff9a4a', art: 'ei', glow: 1.3 },
        // Zwei Feuerschalen vor dem Fels, auf Augenhoehe.
        //
        // Sie loesen ein Problem, das keine Form loesen kann: die Oeffnung
        // zeigt in Laufrichtung, also oft vom Betrachter weg, und von hinten
        // ist die schoenste Hoehle ein grauer Kasten. Ein Licht sieht man
        // von jeder Seite und auf jede Entfernung. Dass sie vor dem Fels
        // stehen und nicht darauf, ist kein Geschmack: darauf steckten sie
        // beim ersten Anlauf in der Kuppel und waren unsichtbar.
        { pos: [-17, 12, 11], size: [7, 5, 7], color: '#ffb44a', art: 'ei', glow: 2 },
        { pos: [17, 11, 12], size: [6.5, 4.6, 6.5], color: '#ffb44a', art: 'ei', glow: 2 },
      ],
    },
  ],
};

/**
 * Die Burg, in vier Stufen von heil bis Ruine.
 *
 * Als Torhaus gebaut, nicht als ganze Burg. Der erste Entwurf war eine Burg
 * mit vier Ecktuermen und massstabsgetreu: auf dem Bildschirm blieben davon
 * vier weisse Kapseln mit roten Kugeln, und sie hing ueber den Rand der
 * Zunge hinaus. Ein Torhaus ist dasselbe in klein und in verstaendlich - ein
 * Tor, zwei Tuerme, ein Bergfried dahinter.
 *
 * Was wegfaellt, faellt sichtbar weg: erst das Banner, dann das Dach des
 * Bergfrieds, dann ein Turm, dann bricht die Mauer. Wer auf die Leben in der
 * Leiste schauen muss, um zu wissen wie es steht, hat den Blick nicht auf
 * dem Spiel.
 */
function burg(schaden: number): RohModell {
  const stein = ['#a89c8b', '#9e9281', '#8f8474', '#7d7364'][schaden] ?? '#a89c8b';
  const dach = ['#a2503a', '#984a36', '#7d3d2d', '#653125'][schaden] ?? '#a2503a';
  const kaesten: RohKasten[] = [
    { pos: [0, 2.5, -1], size: [27, 6, 21], color: '#8a8073', grain: 0.13 },
  ];

  // Bergfried hinter dem Tor.
  kaesten.push({ pos: [0, 14, -6], size: [15, 21, 12], color: stein, grain: 0.12 });
  if (schaden < 2) {
    kaesten.push({ pos: [0, 27, -6], size: [18, 11, 15], color: dach, art: 'ei', grain: 0.11 });
  } else {
    kaesten.push({ pos: [-4, 25, -6], size: [11, 6, 11], color: dach, art: 'ei', grain: 0.17 });
    kaesten.push({ pos: [5, 27, -6], size: [8, 7, 7], color: '#3b3630', art: 'ei', grain: 0.2 });
  }
  if (schaden < 1) {
    kaesten.push({ pos: [0, 36, -6], size: [2.5, 10, 2.5], color: '#6d5a44', art: 'wurst', achse: 'y' });
    kaesten.push({ pos: [4, 38, -6], size: [8, 6, 2], color: '#c9b45a', grain: 0.08 });
  }

  // Zwei Flankentuerme am Tor. Der rechte faellt bei schwerem Schaden.
  const tuerme: readonly number[] = [-10, 10];
  tuerme.forEach((x, i) => {
    const kaputt = schaden >= 3 && i === 1;
    const hoehe = kaputt ? 12 : 24;
    kaesten.push({
      pos: [x, hoehe / 2 + 3, 5],
      size: [10, hoehe, 10],
      color: stein,
      art: 'wurst',
      achse: 'y',
      grain: 0.12,
    });
    if (kaputt) {
      kaesten.push({ pos: [x + 1, hoehe + 4, 4], size: [9, 4, 9], color: '#968b7c', art: 'ei', grain: 0.18 });
      kaesten.push({ pos: [x + 5, 2, 11], size: [8, 4, 7], color: '#a1968a', art: 'ei', grain: 0.18 });
    } else {
      kaesten.push({ pos: [x, hoehe + 7, 5], size: [13, 10, 13], color: dach, art: 'ei', grain: 0.11 });
    }
  });

  // Mauer mit Tor. Bei schwerem Schaden bricht sie links auf.
  if (schaden < 3) {
    kaesten.push({ pos: [0, 18, 5], size: [21, 5, 8], color: stein, grain: 0.12 });
    // Zinnen: drei kurze Bloecke oben auf der Mauer.
    for (const zx of [-6, 0, 6]) {
      kaesten.push({ pos: [zx, 22, 5], size: [4.5, 4, 7], color: stein, grain: 0.12 });
    }
  } else {
    kaesten.push({ pos: [-7, 15, 5], size: [8, 9, 8], color: stein, grain: 0.15 });
    kaesten.push({ pos: [4, 3, 9], size: [10, 5, 8], color: '#a1968a', art: 'ei', grain: 0.18 });
  }

  // Zwei Feuerkoerbe am Tor. Sie brennen, solange die Burg steht, und
  // markieren das Ziel aus jeder Richtung.
  const feuer: RohKasten[] = [];
  const staender = (x: number): RohKasten => ({
    pos: [x, 5, 11],
    size: [3, 8, 3],
    color: '#5f574d',
    art: 'wurst',
    achse: 'y',
  });
  if (schaden < 3) {
    kaesten.push(staender(-12), staender(12));
    feuer.push({ pos: [-12, 11, 11], size: [7, 5, 7], color: '#ffc45e', art: 'ei', glow: 2 });
    feuer.push({ pos: [12, 11, 11], size: [6.5, 4.6, 6.5], color: '#ffc45e', art: 'ei', glow: 2 });
  } else {
    kaesten.push(staender(-12));
    feuer.push({ pos: [-12, 10, 11], size: [6, 4, 6], color: '#ff8a3a', art: 'ei', glow: 1.4 });
  }

  return {
    id: `bau_burg_s${schaden}`,
    parts: [
      { name: 'mauerwerk', pivot: [0, 0, 0], boxes: kaesten },
      { name: 'feuer', pivot: [0, 0, 0], bob: { amp: 0.35, phase: 1.1 }, boxes: feuer },
      // Das Tor ist ein eigenes Teil, damit sein Dunkel nicht in den Stein
      // hineinblutet - der Huellenbau verschmilzt nur innerhalb eines Teils.
      {
        name: 'tor',
        pivot: [0, 0, 0],
        boxes: [
          { pos: [0, 9, 7], size: [11, 15, 8], color: '#2a221c', grain: 0.05 },
          { pos: [0, 9, 3], size: [8, 12, 6], color: '#17120f', grain: 0.04 },
        ],
      },
    ],
  };
}

export const BAUTEN: readonly RohModell[] = [HOEHLE, ...[0, 1, 2, 3].map(burg)];
