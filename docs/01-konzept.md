# Konzept

Stand: 2026-09-17. Dieses Dokument beschreibt das Spiel. Zahlenwerte sind
Startwerte für das Balancing und stehen später in Datendateien, nicht im Code.

## Kurzfassung

Ein Tower-Defense-Spiel für Handy im Klotz-Stil. Zehn handgebaute Karten in drei
Regionen. Der Gegnerweg ist fest, Türme entstehen auf vorgegebenen Bauplätzen
daneben. Vor jeder Karte wählst du vier von zwölf Türmen. Langzeitmotivation
liefern drei ineinandergreifende Systeme: Forschung, Turm-Meisterschaft und
Sterne über drei Schwierigkeitsgrade.

## Getroffene Grundsatzentscheidungen

| Thema | Entscheidung |
|---|---|
| Technik | TypeScript, PixiJS, Capacitor |
| Stil | Klotz-Optik, vorgerenderte Voxel-Sprites |
| Bauen | Fester Weg, freie Bauplätze |
| Progression | Loadout, Forschung, Meisterschaft |
| Ausrichtung | Querformat |
| Ziel | Privates Projekt, Store-Option bleibt offen |

## Grafikstil

Die Bildsprache ist eckig. Würfelförmige Körper, harte Kanten, niedrig
aufgelöste Texturen, steife Animationen mit wenigen Zwischenbildern. Bewusst
kein weicher Look.

Der Anspruch auf hochwertige Grafik wird nicht über mehr Details eingelöst,
sondern über vier Dinge:

1. **Licht.** Jedes Modell wird mit gerichtetem Licht, weichem Umgebungslicht
   und einem echten Schlagschatten vorgerendert. Das erzeugt Plastizität, die
   handgezeichnete Pixelgrafik nur mit viel Aufwand erreicht.
2. **Atmosphäre.** Nebelschichten, Lichtstrahlen, Staubpartikel und ein
   Farbfilter pro Region. Die Karte bekommt Tiefe durch gestaffelte Ebenen.
3. **Rückmeldung.** Jeder Treffer erzeugt einen Aufblitzen des Ziels, einen
   kurzen Rückstoß, Partikel in der Farbe der Schadensart und ein Geräusch.
   Diese Schicht entscheidet mehr über den Qualitätseindruck als die Modelle.
4. **Sauberkeit.** Einheitliche Pixelgröße über alle Objekte, ganzzahlige
   Skalierung, keine Weichzeichnung. Nichts wirkt billiger als gemischte
   Auflösungen.

Jede Region hat ein eigenes Farbklima und eine eigene Palette. Die Paletten
überschneiden sich absichtlich kaum, damit die drei Regionen sich auch auf
einem Vorschaubild sofort unterscheiden.

## Regionen und Level

Zehn Level, aufgeteilt auf drei Regionen. Jedes Level ist eine eigene Karte mit
eigenem Weg und eigener Bauplatz-Anordnung.

### Region 1: Waldsenke, Level 1 bis 4

Grün und goldenes Licht, Laub, Wasserläufe. Über die Wellen hinweg wandert die
Tageszeit Richtung Abend, im Bosslevel ist es Nacht. Die Region führt die
Grundlagen ein.

- Level 1: einfacher Weg, zwei Kurven, Einführung Armbrustturm und Schleuder
- Level 2: Gabelung, der Weg teilt sich und führt wieder zusammen
- Level 3: zwei getrennte Eingänge, ein Ziel
- Level 4: Bosskarte, Waldwächter

### Region 2: Glutschlucht, Level 5 bis 7

Schwarzer Basalt, Lavaadern, Hitzeflimmern, Ascheregen. Hier kommen Flieger und
Feuerwiderstand dazu, das Loadout muss angepasst werden.

- Level 5: schmale Stege über Lava, wenige Bauplätze
- Level 6: erste Flieger, die den Weg ignorieren
- Level 7: Bosskarte, Schmelzherz

### Region 3: Leerlande, Level 8 bis 10

Violett und Tiefschwarz, schwebende Inseln, kein Horizont, langsam treibende
Trümmer. Hier bricht das Spiel seine eigenen Regeln.

- Level 8: Wegstücke erscheinen und verschwinden zyklisch
- Level 9: drei Eingänge, drei Ziele, geteilte Aufmerksamkeit
- Level 10: Bosskarte, Der Verschlinger, drei Phasen

## Gegner

Jeder Gegner hat Lebenspunkte, Tempo, Panzerungstyp und ein Verhalten. Das
Verhalten ist wichtiger als die Werte. Ein Gegner, der nur mehr aushält, ist
kein neuer Gegner.

### Waldsenke

| Name | Rolle | Verhalten |
|---|---|---|
| Moderling | Fleischschild | langsam, viel Leben, keine Besonderheit |
| Krabbler | Schwarm | sehr schnell, wenig Leben, erscheint in Gruppen zu acht |
| Knochenschütze | Panzerung | schießt im Vorbeigehen auf Türme und legt sie kurz still |
| Sprengling | Störer | zündet neben einem Turm und deaktiviert ihn für drei Sekunden |

### Glutschlucht

| Name | Rolle | Verhalten |
|---|---|---|
| Magmakoloss | Tank | zerfällt beim Tod in zwei kleinere Koloss-Splitter |
| Aschefalter | Flieger | folgt nicht dem Weg, fliegt geradlinig zum Ziel |
| Glutgeist | Konter | immun gegen Feuer, setzt getroffene Türme in Brand |
| Schildwart | Verstärker | gibt allen Gegnern im Umkreis einen absorbierenden Schild |

### Leerlande

| Name | Rolle | Verhalten |
|---|---|---|
| Schreiter | Durchbrecher | teleportiert sich in Abständen ein Wegstück nach vorn |
| Leerenbrut | Attentäter | unsichtbar, bis ein Späherturm sie aufdeckt |
| Echo | Heiler | heilt fortlaufend den am stärksten verletzten Gegner in Reichweite |
| Rissgänger | Elite | verdoppelt sein Tempo, sobald es unter halbes Leben fällt |

### Bosse

- **Waldwächter.** Phase eins normal. Unter der Hälfte wurzelt er ein, wird
  kurzzeitig unverwundbar und ruft eine Welle Krabbler.
- **Schmelzherz.** Hinterlässt eine Lavaspur, die Bauplätze blockiert. Bei
  jedem Viertel verlorenem Leben pulst es und schaltet nahe Türme ab.
- **Der Verschlinger.** Drei Phasen mit wechselnder Panzerung. In jeder Phase
  ist genau eine Schadensart wirksam, die anderen prallen ab. Zwingt zu einem
  Loadout, das alle drei Arten abdeckt.

## Schadensarten und Panzerung

Drei Schadensarten: physisch, Feuer, arkan. Drei Panzerungen: Leder, Eisen,
Obsidian, dazu der Sonderfall ätherisch.

| Panzerung | physisch | Feuer | arkan |
|---|---|---|---|
| Leder | 100 % | 100 % | 100 % |
| Eisen | 40 % | 100 % | 110 % |
| Obsidian | 90 % | 20 % | 110 % |
| ätherisch | 0 % | 0 % | 100 % |

Kontrolleffekte stehen getrennt daneben und sind keine Schadensart: Verlangsamen
durch Frost, Fesseln durch Netz, Rückstoß durch Kolben, Rüstungsbruch durch
Alchemie.

Damit bekommt die Loadout-Wahl vor dem Level Gewicht. Ein Aufbau ohne arkane
Quelle scheitert an den ätherischen Gegnern in Region drei, unabhängig von der
Schadenshöhe.

## Türme

Zwölf Türme in vier Rollen. Vier davon sind von Anfang an verfügbar, die
übrigen acht schaltet die Forschung frei.

### Direktschaden

| Turm | Schadensart | Besonderheit |
|---|---|---|
| Armbrustturm | physisch | Grundturm, trifft Luft, hohe Feuerrate |
| Balliste | physisch | sehr große Reichweite, durchschlägt Panzerung, langsam |
| Blitzspule | arkan | springt auf bis zu vier Ziele, ideal gegen Schwärme |

### Fläche

| Turm | Schadensart | Besonderheit |
|---|---|---|
| Schleuder | physisch | Bogenschuss mit Flächenschaden, trifft keine Luft |
| Glutdüse | Feuer | Kegel vor sich, setzt in Brand, Schaden über Zeit |
| Ambossfalle | physisch | wird auf den Weg gesetzt, einmalig hoher Schaden, lädt nach |

### Kontrolle

| Turm | Effekt | Besonderheit |
|---|---|---|
| Frostturm | Verlangsamen | Fläche, stapelt bis zu einer Höchstgrenze |
| Netzwerfer | Fesseln | hält ein einzelnes Ziel vollständig fest |
| Kolbenstoß | Rückstoß | schiebt Gegner auf dem Weg zurück |

### Unterstützung

| Turm | Effekt | Besonderheit |
|---|---|---|
| Leuchtfeuer | Verstärkung | erhöht Schaden und Reichweite benachbarter Türme |
| Alchemieturm | Schwächung | bricht Panzerung und erhöht erlittenen Schaden |
| Späherturm | Aufdeckung | macht Unsichtbare sichtbar, erhöht Reichweite im Umkreis |

Nicht jeder Turm trifft Luftziele. Armbrustturm, Balliste, Blitzspule und
Frostturm können es, der Rest nicht. Das ist der Grund, warum das Loadout ab
Region zwei überdacht werden muss.

## Zielauswahl

Jeder Turm hat eine einstellbare Zielpriorität: Erster, Letzter, Stärkster,
Schwächster, Nächster. Die Einstellung ist ein Antippen im Turmmenü. Das ist
billig zu bauen und gibt erfahrenen Spielern viel Kontrolle, ohne Anfänger zu
überfordern.

## Ablauf eines Levels

1. Vorbereitung: Loadout aus vier Türmen wählen, Karte und Wellenübersicht
   ansehen.
2. Bauphase: Startgold platzieren, keine Zeitbegrenzung vor der ersten Welle.
3. Wellen: zwischen den Wellen läuft ein Zähler, vorzeitiges Starten gibt
   Bonusgold. Das belohnt Können, ohne Anfänger zu bestrafen.
4. Ausbau: jeder Turm hat drei Ausbaustufen, danach eine Gabelung zwischen zwei
   Endformen. Die Gabelung ist endgültig für diese Partie.
5. Abschluss: Sternewertung nach verbleibenden Leben.

Leben pro Karte: zwanzig. Drei Sterne bei zwanzig verbleibenden Leben, zwei
Sterne ab fünfzehn, ein Stern bei mindestens einem.

## Bedienung auf dem Handy

- Antippen eines freien Bauplatzes öffnet ein Ringmenü mit den vier Türmen des
  Loadouts. Preis und Reichweitenvorschau erscheinen sofort.
- Antippen eines eigenen Turms öffnet Ausbau, Verkauf und Zielpriorität.
- Ziehen verschiebt die Karte, Zusammenziehen zweier Finger zoomt.
- Geschwindigkeitsschalter mit einfach, doppelt und dreifach. Wird von erfahrenen
  Spielern ständig benutzt und gehört an eine gut erreichbare Ecke.
- Alle Bedienelemente liegen in den unteren Bildschirmdritteln, erreichbar mit
  den Daumen bei gehaltenem Gerät im Querformat.
