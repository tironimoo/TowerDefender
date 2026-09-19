# Progression

Zehn Level sind in wenigen Stunden durchgespielt. Die Langzeitmotivation kommt
nicht aus der Menge an Karten, sondern aus drei Systemen, die sich gegenseitig
antreiben. Dieses Dokument beschreibt sie und den geplanten Verlauf.

## Überblick

| Ebene | Währung | Wirkung | Zurücksetzbar |
|---|---|---|---|
| Loadout | keine | vier von zwölf Türmen pro Karte | jederzeit |
| Forschung | Splitter | dauerhafte Freischaltungen | gegen Gebühr |
| Meisterschaft | Turm-Erfahrung | Spezialisierung pro Turm | gegen Gebühr |
| Sterne | Sterne | schaltet Karten und Modi frei | nein |

Die Trennung ist bewusst. Loadout ist eine taktische Entscheidung vor jeder
Karte. Forschung ist eine langsame, breite Verbesserung. Meisterschaft ist die
Vertiefung in einen einzelnen Turm. Sterne sind der Fortschrittsbalken.

## Loadout

Vor jeder Karte wählst du vier Türme. Mehr nicht. Das ist die wichtigste
einzelne Entscheidung im ganzen Entwurf.

Warum eine Begrenzung: ohne sie baut jeder Spieler auf jeder Karte dieselben
zwei stärksten Türme, und alle anderen zehn werden zu Dekoration. Mit der
Begrenzung muss jede Karte neu gelöst werden, und ein Turm, der nur in einer
Situation glänzt, bekommt einen Platz.

Die Karte zeigt vor der Wahl an, welche Gegnertypen vorkommen und welche
Panzerungen dominieren. Das ist keine Nachsicht, sondern Voraussetzung dafür,
dass die Wahl eine Entscheidung ist und kein Raten.

Loadouts lassen sich als benannte Vorlagen speichern.

## Forschung

Währung sind Splitter. Quellen:

- erstmaliges Abschließen einer Karte
- jeder neue Stern
- Endlos-Modus nach erreichter Wellenzahl
- wöchentliche Herausforderung

Der Baum hat drei Äste und 28 Knoten. Die vollständige Liste steht in
`05-startwerte.md` und wird aus den Daten erzeugt.

- **Arsenal.** Schaltet die acht zusätzlichen Türme frei. Jeder Turm kostet
  spürbar, das Freischalten ist ein Ereignis und kein Häkchen.
- **Handwerk.** Allgemeine Verbesserungen: Ausbaukosten, Startgold, Reichweite,
  Projektiltempo, Verkaufswert.
- **Kommando.** Systemische Effekte: zusätzliches Leben pro Karte, höherer
  Bonus für vorzeitigen Wellenstart, und ein fünfter Loadout-Platz als
  teuerster Knoten im Spiel.

Knoten haben Voraussetzungen, aber keine Sackgassen. Ein Anfänger soll nichts
dauerhaft verbauen können. Umverteilen gibt drei Viertel der ausgegebenen
Splitter zurück und ist jederzeit möglich.

Splitter kommen aus dem erstmaligen Abschluss einer Karte, aus jedem neuen
Stern und aus dem Endlos-Modus.

## Wie schnell die Türme kommen

Eine Karte bringt beim ersten Abschluss mit drei Sternen 24 Splitter. Die acht
zusätzlichen Türme kosten zusammen 172 — die zehn Karten auf Normal bringen
240. Damit steht nach der ersten Karte schon der zweite Turm zur Wahl, nach der
vierten sind es fünf, und gegen Ende der Kampagne stehen alle acht bereit.

Das ist Absicht und war lange falsch eingestellt: vorher kostete das Arsenal
550 Splitter. Wer die ganze Kampagne mit drei Sternen durchspielte und *nichts*
anderes kaufte, hatte am Ende vier der acht Türme. Der erste kostete 25 — mehr,
als die erste Karte einbrachte. Die Turmwahl ist der interessanteste Teil der
Vorbereitung; sie gehört an den Anfang, nicht ans Ende.

Der lange Weg sind jetzt Handwerk und Kommando. Die bleiben teuer und tragen
das Spiel über Hart und Albtraum hinaus.

## Schwierigkeitsgrade

| Grad | Leben der Gegner | Tempo | Gold | Wellen |
|---|---|---|---|---|
| Leicht | 60 % | 90 % | 130 % | wie Normal |
| Normal | 100 % | 100 % | 100 % | — |
| Hart | 160 % | 110 % | 90 % | vier mehr |
| Albtraum | 260 % | 120 % | 80 % | acht mehr, plus Mutator |

Leicht ist kein halbes Spiel: gleiche Karten, gleiche Wellen, gleiche Gegner.
Nur ist ein Fehler dort billiger *und* ausbesserbar, weil gleichzeitig mehr
Gold hereinkommt. Ein Sieg auf Leicht öffnet die nächste Karte und zählt für
den Endlos-Modus — sonst wäre der Grad eine Sackgasse statt eines Weges durch
das Spiel. Hart setzt weiterhin einen Sieg auf Normal voraus.

## Reichweite schlägt Schaden

Der wirksame Schaden eines Turms ist nicht sein Schaden je Sekunde, sondern
Schaden mal Zeit im Wirkungsbereich — und die hängt daran, wie viel Weglänge
er überhaupt abdeckt. Bauplätze liegen in 1,9 und 3,1 Kacheln Abstand zum Weg,
also wächst die Deckung ungefähr mit `2·√(r² − d²)`. Gemessen mit
`npm run reichweite`:

| Turm | Reichweite | abgedeckte Weglänge |
|---|---|---|
| Kolbenstoß | 1,8 → **3,0** | 0,0 → 5,5 |
| Frostturm | 2,5 → **3,2** | 3,4 → 6,2 |
| Glutdüse | 2,5 → **3,0** | 3,4 → 5,5 |
| Blitzspule | 3,0 → **3,6** | 5,5 → 7,5 |
| Armbrustturm | 3,5 | 7,2 |
| Schleuder | 4,5 | 11,6 |
| Balliste | 7,0 | 21,7 |

Der Kolbenstoß hatte Reichweite 1,8, der innere Bauplatzring liegt bei 1,9. Um
ein Zehntel verfehlt — und damit auf acht von zehn Karten von *keinem einzigen*
Bauplatz aus einsatzfähig. Nicht schwach, sondern wirkungslos, und im
Datenblatt war davon nichts zu sehen.

Die Spreizung erklärt auch, warum das Spiel zu schwer wirkte: die Balliste war
je Gold rund zwanzigmal so wirksam wie der Frostturm. Wer nicht zufällig sie
oder die Schleuder wählte, baute eine um ein Vielfaches schwächere
Verteidigung, als das Balancing annahm.

Dagegen steht jetzt eine Prüfung in `src/data/validate.ts`: Ein Turm, dessen
Reichweite kleiner ist als der Abstand des nächsten Bauplatzes zum Weg, lässt
`npm run test` scheitern — mit Nennung von Turm, Karte und beiden Zahlen.

## Die Schwierigkeitskurve

Gemessen wird sie mit `npm run kurve`. Anders als `npm run balance` zeigt das
Werkzeug nicht nur das beste Loadout, sondern jedes — genau darauf kommt es an:
eine Karte, die nur ein einziges starkes Loadout schafft, ist keine Aufgabe,
sondern eine Wand, und eine Karte, die jedes Loadout ohne Lebensverlust
gewinnt, ist keine Aufgabe.

Drei Stellräder formen die Kurve:

- **Stärke der Karte** (`staerke` in `src/data/levels/index.ts`): Faktor auf das
  Leben aller Gegner. Die ersten vier Karten stehen auf 1,5 bis 1,6, die
  späten auf 0,75 bis 0,9. Ohne dieses Rad ließe sich eine Karte nur über
  Gegnermengen härten, und das ändert ihren Charakter mit.
- **Goldwachstum** (`WAVE_GOLD_GROWTH`): 1,075 gegen 1,095 beim Leben. Der
  Abstand zwischen beiden Zahlen *ist* die Steigung der Kampagne. Bei 1,06
  wuchs die Bedrohung bis Welle 25 auf das 2,2-fache dessen, was der Spieler
  bezahlen konnte.
- **Startgold je Karte**: steigt mit der Region mit, damit der Sprung in die
  Glut und in die Leere bezahlbar bleibt.

Zwei Dinge waren keine Einstellungsfrage, sondern Fehler:

- Basaltstege hatte 16 Bauplätze, die Karte davor 18. Es war die einzige
  Karte, auf der die Zahl sank — ausgerechnet beim Sprung in die Glut.
- Ätherische Gegner ließen null physischen und null Feuerschaden durch. In den
  Leerlanden steht der Schreiter ab Welle eins; ein Loadout ohne Arkanturm war
  dort nicht im Nachteil, sondern handlungsunfähig. Jetzt sind es 25 Prozent:
  Arkan bleibt viermal so gut, aber aus der Sperre wird eine Entscheidung.

## Spezialfähigkeiten

Der letzte Ausbau ist nicht das Ende eines Turms. Danach öffnen sich zwei
Spezialfähigkeiten, jede in zwei Rängen. Sie kosten das 1,4- und das 2,2-fache
des Grundpreises und sind damit bewusst teuer: in den späten Wellen soll Gold
noch irgendwohin fließen können, ohne dass man Plätze zubaut, die es nicht gibt.

Die beiden Fähigkeiten eines Turms ziehen in verschiedene Richtungen — beim
Armbrustturm etwa Feuerrate gegen Schaden mit Durchschlag. Weil beide steigerbar
sind, ist das keine endgültige Gabelung, sondern eine Reihenfolge: was zuerst,
und was bleibt liegen, wenn das Gold nicht für alles reicht.

Gelernte Ränge erscheinen als kleine Edelsteine über dem Turm, damit man eine
volle Karte lesen kann, ohne jeden Turm einzeln anzutippen.

## Meisterschaft

Jeder Turm sammelt eigene Erfahrung, und zwar nur, wenn er tatsächlich Schaden
verursacht oder Effekte auslöst. Ein mitgeschleppter Turm steigt nicht auf.

Stufen eins bis zwanzig pro Turm. Kleine passive Verbesserungen auf jeder Stufe,
und auf drei Stufen eine echte Wahl zwischen zwei Spezialisierungen.

| Stufe | Wahl |
|---|---|
| 5 | Ausrichtung des Grundverhaltens |
| 10 | Veränderung der Rolle |
| 15 | Zuspitzung, meist mit einem Nachteil |

Zwölf Türme mal drei Wahlstufen mal zwei Möglichkeiten ergibt 72
Spezialisierungen. Jede davon ist eine eigene Entscheidung mit eigenem Namen,
keine Variante derselben Zahl.

Beispiel Frostturm:

- Stufe 5: stärkere Verlangsamung gegen weniger Reichweite, oder größere
  Reichweite gegen schwächere Verlangsamung.
- Stufe 10: der Frost verursacht zusätzlich arkanen Schaden, oder verlangsamte
  Gegner erleiden von allen Quellen erhöhten Schaden.
- Stufe 15: gefrorene Gegner können vollständig einfrieren, sind dann aber
  kurzzeitig immun gegen Schaden. Hohes Risiko, hoher Ertrag.

Spezialisierungen mit Nachteil sind Absicht. Sie erzeugen Aufbauten, über die
man nachdenken muss, statt nur größerer Zahlen.

Umlernen ist jederzeit möglich. Je Wahlstufe gilt genau eine Entscheidung, eine
neue ersetzt die alte.

Die Erfahrungskurve ist bewusst steil. Die erste Wahl auf Stufe fünf kommt nach
wenigen Partien, die Höchststufe zwanzig erst nach vielen.

## Sterne, Schwierigkeit und Wiederspielbarkeit

Drei Schwierigkeitsgrade, je drei Sterne pro Karte. Neunzig Sterne insgesamt.

| Grad | Freischaltung | Änderungen |
|---|---|---|
| Normal | von Beginn an | Grundwerte |
| Hart | Karte auf Normal geschafft | mehr Leben und Tempo, zusätzliche Wellen |
| Albtraum | Karte auf Hart mit drei Sternen | feste Mutatoren pro Karte, kein Zurückspulen |

Auf Albtraum trägt jede Karte einen eigenen Mutator, der sie inhaltlich
verändert. Beispiele: alle Gegner starten mit Schild, Türme kosten im Ausbau das
Doppelte, es gibt keine Bauphase vor der ersten Welle.

Nach Level zehn öffnet der Endlos-Modus. Wellen werden fortlaufend stärker, die
erreichte Wellenzahl ist die Bestenliste gegen dich selbst. Das ist der Teil,
der nach dem Durchspielen trägt.

Dazu eine wöchentliche Herausforderung: feste Karte, fester Schwierigkeitsgrad,
fester Mutator, festes Loadout aus allen zwölf Türmen und feste Zufallsfolge.
Für alle gleich, jede Woche neu, und sie läuft endlos. Gewertet wird die
erreichte Welle. Das kostet fast nichts, weil die Simulation ohnehin mit
gesetztem Zufall arbeitet.

## Geplanter Verlauf

| Zeitpunkt | Was passiert |
|---|---|
| Minute 0 bis 10 | Level 1 und 2, zwei Türme, keine Systeme sichtbar |
| Minute 10 bis 30 | Forschung öffnet, erster zusätzlicher Turm |
| Stunde 1 | Region zwei, Flieger zwingen zur Loadout-Anpassung |
| Stunde 2 bis 4 | Meisterschaft der Stammtürme erreicht Stufe 10 |
| Stunde 4 bis 6 | Level 10 auf Normal geschafft, Endlos-Modus öffnet |
| ab Stunde 6 | Hart und Albtraum, Spezialisierungen auf Stufe 15, Endlos |

Wichtig: Forschung und Meisterschaft werden nicht sofort gezeigt. Ein Anfänger
sieht in Level 1 nur eine Karte, Gold und zwei Türme. Jedes System öffnet, wenn
das vorherige verstanden ist. Alles auf einmal sichtbar zu machen ist der
häufigste Fehler in diesem Genre.

## Was bewusst nicht vorkommt

- Keine Energie oder Wartezeiten.
- Kein Zufall bei Freischaltungen, kein Ziehen von Türmen.
- Keine Gegner, deren einzige Eigenschaft eine größere Zahl ist.
- Keine Verbesserung, die alles pauschal stärker macht, ohne etwas zu verändern.
