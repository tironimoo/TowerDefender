# Startwerte

Diese Datei wird erzeugt. Nicht von Hand aendern, sondern die Daten unter
`src/data` und dann `npm run doku` ausfuehren.

Erzeugt am 2026-09-19.

## Einheiten

- Reichweite und Flaeche in Kacheln
- Tempo in Kacheln pro Sekunde
- Feuerrate in Schuessen pro Sekunde
- Schaden je Treffer, sofern nicht anders vermerkt

## Tuerme

| Turm | Kosten | Schaden | Rate | Weite | Art | Luft | Besonderheit |
|---|---|---|---|---|---|---|---|
| Armbrustturm | 100 | 12 | 1.2 | 3.5 | physisch | ja | — |
| Schleuder | 140 | 30 | 0.6 | 4.5 | physisch | nein | Flaeche 1.2 |
| Frostturm | 130 | 6 | 1 | 2.5 | arkan | ja | Flaeche 2.5, verlangsamt 35 % fuer 2 s |
| Glutduese | 160 | 8 | 4 | 2.5 | feuer | nein | Flaeche 1, Brand 6/s fuer 3 s |
| Balliste | 220 | 95 | 0.35 | 7 | physisch | ja | Durchschlag 50 %, Forschung noetig |
| Blitzspule | 180 | 18 | 0.8 | 3 | arkan | ja | 3 Spruenge, je 25 % schwaecher, Forschung noetig |
| Ambossfalle | 90 | 120 | 0.125 | 1 | physisch | nein | Flaeche 0.9, Durchschlag 25 %, steht auf dem Weg, Forschung noetig |
| Netzwerfer | 150 | 0 | 0.14 | 4 | arkan | ja | verlangsamt 100 % fuer 2 s, Forschung noetig |
| Kolbenstoss | 110 | 6 | 0.2 | 1.8 | physisch | nein | Flaeche 1.8, Rueckstoss 1.5, Forschung noetig |
| Leuchtfeuer | 200 | 0 | 0 | 3 | arkan | nein | +20 % Schaden im Umkreis, +15 % Reichweite im Umkreis, Forschung noetig |
| Alchemieturm | 190 | 0 | 0 | 3.5 | arkan | nein | -40 % Panzerung, +15 % erlittener Schaden, Forschung noetig |
| Spaehturm | 80 | 0 | 0 | 5 | arkan | nein | +10 % Reichweite im Umkreis, deckt Unsichtbare auf, Forschung noetig |

## Ausbau

Drei Stufen. Die Zuwaechse multiplizieren sich: eine Stufe mit plus 55
Prozent erhoeht den bereits erreichten Wert.

| Stufe | Kosten als Anteil des Grundpreises | Schaden | Reichweite |
|---|---|---|---|
| 1 | 60 % | +55 % | +8 % |
| 2 | 100 % | +55 % | +8 % |
| 3 | 160 % | +55 % | +8 % |

Verkauf erstattet 70 Prozent des Investierten.
Die Forschung kann das erhoehen.

## Gegner

| Gegner | Leben | Tempo | Panzerung | Gold | Besonderheit |
|---|---|---|---|---|---|
| Moderling | 60 | 0.8 | leder | 8 | — |
| Krabbler | 18 | 2.2 | leder | 3 | — |
| Knochenschuetze | 90 | 1 | eisen | 13 | legt Tuerme im Umkreis 2.6 fuer 2.5 s still |
| Sprengling | 45 | 1.6 | leder | 10 | detoniert einmal, legt Tuerme im Umkreis 1.7 still |
| Magmakoloss | 480 | 0.5 | obsidian | 38 | zerfaellt in 2 kolosssplitter |
| Kolosssplitter | 120 | 0.9 | obsidian | 6 | — |
| Aschefalter | 70 | 1.8 | leder | 12 | fliegt |
| Glutgeist | 140 | 1.2 | obsidian | 18 | immun gegen feuer, legt Tuerme im Umkreis 2.2 fuer 2 s still |
| Schildwart | 200 | 0.9 | eisen | 26 | schildet 70 im Umkreis 3.2 alle 4 s |
| Schreiter | 260 | 1.1 | aetherisch | 28 | springt 3.5 Kacheln alle 5 s |
| Leerenbrut | 120 | 2.4 | leder | 20 | unsichtbar |
| Echo | 180 | 1 | aetherisch | 30 | heilt 34 im Umkreis 3.5 alle 2.5 s |
| Rissgaenger | 420 | 1 | eisen | 44 | unter 50 % Leben 2fach schnell |
| Waldwaechter | 2600 | 0.55 | eisen | 220 | Boss mit 3 Phasen |
| Schmelzherz | 4200 | 0.5 | obsidian | 300 | Boss mit 4 Phasen |
| Der Verschlinger | 7200 | 0.5 | obsidian | 420 | Boss mit 3 Phasen |

## Panzerung gegen Schadensart

| Panzerung | physisch | feuer | arkan |
|---|---|---|---|
| leder | 100 % | 100 % | 100 % |
| eisen | 40 % | 100 % | 110 % |
| obsidian | 90 % | 20 % | 110 % |
| aetherisch | 25 % | 25 % | 100 % |

Durchschlag hebt einen Teil des Widerstands auf. Eine vollstaendige
Immunitaet bleibt jedoch immun.

## Karten

| Nr | Karte | Region | Groesse | Wege | Bauplaetze | Fallen | Wellen | Startgold | Albtraum |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Lichtung am Moorbach | wald | 20×12 | 1 | 12 | 2 | 10 | 250 | hetze |
| 2 | Nebelsenke | wald | 22×13 | 1 | 14 | 3 | 10 | 250 | kurzsichtig |
| 3 | Zwei Furten | wald | 22×13 | 2 | 13 | 2 | 14 | 300 | teuer |
| 4 | Wurzelgrund | wald | 22×13 | 1 | 18 | 4 | 14 | 320 | zaeh |
| 5 | Basaltstege | glut | 22×13 | 1 | 18 | 4 | 16 | 450 | kurzsichtig |
| 6 | Aschewind | glut | 24×14 | 2 | 18 | 4 | 16 | 440 | duerre |
| 7 | Schmelzkessel | glut | 22×13 | 1 | 20 | 4 | 18 | 470 | gepanzert |
| 8 | Wandelpfad | leere | 24×14 | 1 | 20 | 4 | 20 | 500 | hetze |
| 9 | Dreifach | leere | 26×15 | 3 | 21 | 5 | 20 | 560 | teuer |
| 10 | Der Schlund | leere | 24×14 | 2 | 18 | 5 | 25 | 560 | gepanzert |

## Steigerung und Wirtschaft

| Groesse | Wert |
|---|---|
| Leben je Welle | mal 1.095 gegenueber der vorherigen |
| Gold je Welle | mal 1.075 |
| Vorzeitiger Wellenstart | 1 Gold je verbleibender Sekunde |
| Leben je Karte | 20, Bosse kosten alle auf einmal |

Bosse werden bewusst nicht mit der Wellensteigerung skaliert. Sie sind fuer
ihre Karte entworfen.

## Schwierigkeitsgrade

| Grad | Leben | Tempo | Gold | Zusatzwellen |
|---|---|---|---|---|
| normal | 100 % | 100 % | 100 % | +0 |
| hart | 160 % | 110 % | 90 % | +4 |
| albtraum | 260 % | 120 % | 80 % | +8 |

Auf Albtraum traegt jede Karte zusaetzlich ihren eigenen Mutator.

## Mutatoren

| Mutator | Wirkung |
|---|---|
| Gepanzert | Jeder Gegner startet mit einem Schild von einem Drittel seines Lebens. |
| Knappe Kasse | Ausbauten kosten das Doppelte. |
| Hetze | Keine Bauphase vor der ersten Welle, und alle Gegner sind schneller. |
| Kurzsichtig | Alle Tuerme haben ein Viertel weniger Reichweite. |
| Zaeh | Gegner haben die Haelfte mehr Leben, geben dafuer mehr Gold. |
| Duerre | Ein Drittel weniger Gold aus allen Quellen. |

## Forschung

28 Knoten, zusammen 1877 Splitter.

| Knoten | Ast | Kosten | Wirkung |
|---|---|---|---|
| Spaehturm | arsenal | 10 | Deckt unsichtbare Gegner auf und erhoeht die Reichweite der Nachbarn. |
| Ambossfalle | arsenal | 12 | Eine Falle auf dem Weg. Schlaegt hart zu und laedt lange. |
| Balliste | arsenal | 18 | Sehr grosse Reichweite, durchschlaegt die halbe Panzerung. |
| Kolbenstoss | arsenal | 18 | Schiebt Gegner auf dem Weg zurueck und schenkt dir Zeit. |
| Blitzspule | arsenal | 25 | Arkaner Blitz, der auf weitere Ziele springt. Unverzichtbar in den Leerlanden. |
| Netzwerfer | arsenal | 25 | Haelt ein einzelnes Ziel vollstaendig fest. |
| Leuchtfeuer | arsenal | 32 | Verstaerkt alle benachbarten Tuerme. |
| Alchemieturm | arsenal | 32 | Bricht die Panzerung der Gegner im Umkreis. |
| Geschliffen I | handwerk | 20 | Alle Tuerme richten fuenf Prozent mehr Schaden an. |
| Geschliffen II | handwerk | 45 | Noch einmal sechs Prozent mehr Schaden. |
| Geschliffen III | handwerk | 90 | Noch einmal sieben Prozent mehr Schaden. |
| Weitblick I | handwerk | 25 | Vier Prozent mehr Reichweite fuer alle Tuerme. |
| Weitblick II | handwerk | 60 | Noch einmal fuenf Prozent mehr Reichweite. |
| Sparsam I | handwerk | 30 | Ausbauten kosten sechs Prozent weniger. |
| Sparsam II | handwerk | 65 | Ausbauten kosten noch einmal sieben Prozent weniger. |
| Sparsam III | handwerk | 120 | Ausbauten kosten noch einmal acht Prozent weniger. |
| Ruecklage I | handwerk | 25 | Vierzig Gold mehr zu Beginn jeder Karte. |
| Ruecklage II | handwerk | 55 | Noch einmal sechzig Gold mehr zu Beginn. |
| Ruecklage III | handwerk | 100 | Noch einmal neunzig Gold mehr zu Beginn. |
| Wiederverwertung I | handwerk | 30 | Verkaufen erstattet fuenf Prozent mehr. |
| Wiederverwertung II | handwerk | 70 | Verkaufen erstattet noch einmal zehn Prozent mehr. |
| Bollwerk I | kommando | 40 | Zwei Leben mehr auf jeder Karte. |
| Bollwerk II | kommando | 95 | Noch einmal drei Leben mehr. |
| Bollwerk III | kommando | 180 | Noch einmal fuenf Leben mehr. |
| Drangsal I | kommando | 45 | Fuenfzehn Prozent mehr Bonus fuer vorzeitigen Wellenstart. |
| Drangsal II | kommando | 100 | Noch einmal fuenfundzwanzig Prozent mehr Wellenbonus. |
| Drangsal III | kommando | 190 | Noch einmal vierzig Prozent mehr Wellenbonus. |
| Fuenfter Platz | kommando | 320 | Ein fuenfter Turm im Loadout. Der teuerste Knoten im Spiel, und der lohnendste. |

## Meisterschaft

Hoechststufe 20. Wahl auf den Stufen 5, 10, 15.

| Stufe | Erfahrung insgesamt |
|---|---|
| 2 | 5.091 |
| 5 | 50.312 |
| 10 | 284.605 |
| 15 | 784.279 |
| 20 | 1.609.969 |

Erfahrung entsteht nur aus tatsaechlich angerichtetem Schaden. Ein
mitgeschleppter Turm steigt nicht auf.

## Pruefungen, die das Simulationswerkzeug absichert

Siehe `tests/balance.test.ts` und `npm run balance`.

1. Karte 1 ist mit Armbrustturm und Schleuder allein zu gewinnen.
2. Alle zehn Karten sind auf Normal mit einem passenden Loadout zu schaffen.
3. Ein Loadout ohne Schadensquelle kann nie gewinnen.
4. In den Leerlanden scheitert ein rein physischer Aufbau, ein arkaner nicht.
5. Kein einzelner Turm traegt mehr als 85 Prozent des Schadens.
6. Gleicher Ausgangswert ergibt immer dasselbe Ergebnis.
