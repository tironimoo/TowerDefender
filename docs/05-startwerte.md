# Startwerte für das Balancing

Diese Zahlen sind der Ausgangspunkt, nicht das Ergebnis. Sie existieren, damit
der erste spielbare Stand nicht bei null anfängt. Ausbalanciert wird später mit
Messungen aus dem Simulationswerkzeug, siehe `03-architektur.md`.

Alle Werte landen in Datendateien unter `src/data/`. Keiner davon steht im Code.

## Einheiten

- Reichweite in Kacheln
- Tempo in Kacheln pro Sekunde
- Feuerrate in Schüssen pro Sekunde
- Schaden pro Treffer, sofern nicht anders vermerkt

## Türme, Grundstufe

| Turm | Kosten | Schaden | Rate | Reichweite | Art | Luft |
|---|---|---|---|---|---|---|
| Armbrustturm | 100 | 12 | 1,2 | 3,5 | physisch | ja |
| Balliste | 220 | 95 | 0,35 | 7,0 | physisch | ja |
| Blitzspule | 180 | 18 | 0,8 | 3,0 | arkan | ja |
| Schleuder | 140 | 30 | 0,6 | 4,5 | physisch | nein |
| Glutdüse | 160 | 8 | 4,0 | 2,5 | Feuer | nein |
| Ambossfalle | 90 | 120 | 0,125 | Weg | physisch | nein |
| Frostturm | 130 | 0 | 1,0 | 2,5 | Kontrolle | ja |
| Netzwerfer | 150 | 0 | 0,14 | 4,0 | Kontrolle | ja |
| Kolbenstoß | 110 | 0 | 0,2 | 1,8 | Kontrolle | nein |
| Leuchtfeuer | 200 | 0 | dauerhaft | 3,0 | Verstärkung | entfällt |
| Alchemieturm | 190 | 0 | dauerhaft | 3,5 | Schwächung | entfällt |
| Späherturm | 80 | 0 | dauerhaft | 5,0 | Aufdeckung | entfällt |

Sondereffekte:

- Balliste durchschlägt die Hälfte der Panzerung.
- Blitzspule springt auf bis zu vier Ziele, jeder Sprung mit einem Viertel
  weniger Schaden.
- Schleuder trifft im Umkreis von 1,2 Kacheln.
- Glutdüse trifft einen Kegel und setzt in Brand, sechs Schaden pro Sekunde
  über drei Sekunden, nicht stapelbar.
- Ambossfalle steht auf dem Weg statt auf einem Bauplatz und lädt acht Sekunden.
- Frostturm verlangsamt um 35 Prozent im Umkreis, höchstens zweifach gestapelt.
- Netzwerfer hält ein Einzelziel zwei Sekunden vollständig fest.
- Kolbenstoß schiebt Gegner anderthalb Kacheln auf dem Weg zurück.
- Leuchtfeuer gibt benachbarten Türmen 20 Prozent Schaden und 15 Prozent
  Reichweite. Wirkt nicht auf andere Leuchtfeuer.
- Alchemieturm senkt Panzerung um 40 Prozent und erhöht erlittenen Schaden um
  15 Prozent.

## Ausbau

Drei Stufen, danach eine einmalige Wahl zwischen zwei Endformen.

| Stufe | Kosten als Anteil des Grundpreises | Schaden | Reichweite |
|---|---|---|---|
| 1 | 60 % | +55 % | +8 % |
| 2 | 100 % | +55 % | +8 % |
| 3 | 160 % | +55 % | +8 % |
| Endform | 200 % | eigene Wirkung | eigene Wirkung |

Verkauf erstattet 70 Prozent des Investierten. Die Forschung kann das erhöhen.

## Gegner, Grundwerte in der ersten Welle ihrer Region

### Waldsenke

| Gegner | Leben | Tempo | Panzerung | Gold |
|---|---|---|---|---|
| Moderling | 60 | 0,8 | Leder | 6 |
| Krabbler | 18 | 2,2 | Leder | 2 |
| Knochenschütze | 90 | 1,0 | Eisen | 10 |
| Sprengling | 45 | 1,6 | Leder | 8 |

### Glutschlucht

| Gegner | Leben | Tempo | Panzerung | Gold |
|---|---|---|---|---|
| Magmakoloss | 480 | 0,5 | Obsidian | 30 |
| Aschefalter | 70 | 1,8 | Leder | 9 |
| Glutgeist | 140 | 1,2 | Obsidian | 14 |
| Schildwart | 200 | 0,9 | Eisen | 20 |

### Leerlande

| Gegner | Leben | Tempo | Panzerung | Gold |
|---|---|---|---|---|
| Schreiter | 260 | 1,1 | ätherisch | 22 |
| Leerenbrut | 120 | 2,4 | Leder | 16 |
| Echo | 180 | 1,0 | ätherisch | 24 |
| Rissgänger | 420 | 1,0 | Eisen | 35 |

Der Rissgänger verdoppelt sein Tempo unter halbem Leben. Der Magmakoloss
zerfällt beim Tod in zwei Splitter mit je einem Viertel seiner Werte.

## Steigerung über die Wellen

Innerhalb eines Levels steigt das Leben je Welle um elf Prozent gegenüber der
vorherigen. Das Tempo bleibt konstant, sonst wird die Schwierigkeit unlesbar.
Die Goldbelohnung steigt um vier Prozent je Welle, also deutlich langsamer als
die Lebenspunkte. Dadurch wird es mit jeder Welle enger, ohne dass eine Zahl
plötzlich springt.

Schwierigkeitsgrade:

| Grad | Leben | Tempo | Wellen | Gold |
|---|---|---|---|---|
| Normal | 100 % | 100 % | Grundzahl | 100 % |
| Hart | 160 % | 110 % | +4 | 90 % |
| Albtraum | 260 % | 120 % | +8 | 80 % |

## Wirtschaft

| Größe | Wert |
|---|---|
| Startgold | 250 |
| Leben pro Karte | 20 |
| Wellenbonus | 40 plus 8 je vorheriger Welle |
| Vorzeitiger Start | 1 Gold je verbleibender Sekunde |

## Wellenzahl je Level

| Level | Wellen |
|---|---|
| 1 bis 2 | 10 |
| 3 bis 4 | 14 |
| 5 bis 6 | 16 |
| 7 | 18 mit Boss |
| 8 bis 9 | 20 |
| 10 | 25 mit dreiphasigem Boss |

## Prüfungen, die das Simulationswerkzeug dauerhaft absichert

1. Level 1 auf Normal ist mit Armbrustturm und Schleuder allein zu gewinnen.
2. Kein Level ab 5 ist mit einem einzigen Turmtyp zu gewinnen.
3. Kein Turm stellt über alle Level gemittelt mehr als ein Drittel des Schadens.
4. Jeder der zwölf Türme ist in mindestens zwei Levels Teil einer erfolgreichen
   Lösung. Ein Turm, der das nie schafft, ist zu schwach und wird geändert.
5. Auf Albtraum kommt mindestens ein Gegner durch, wenn ohne Ausbau gespielt
   wird. Sonst ist der Schwierigkeitsgrad ein Etikett ohne Wirkung.
