# Fahrplan

Die Reihenfolge war so gewählt, dass nach jedem Abschnitt etwas Spielbares
vorlag. Alle Abschnitte sind umgesetzt. Dieses Dokument hält fest, was jeweils
entstanden ist, und was als Nächstes sinnvoll wäre.

## Abschnitt 0: Gerüst

Projekt mit Vite und TypeScript, PixiJS eingebunden, Linterregeln, Vitest.

## Abschnitt 1: Der Kern ohne Grafik

Simulation mit festem Zeitschritt, Wegfortschritt, Türme, Gegner, Schaden,
Gold, Leben. Vollständig ohne PixiJS, geprüft durch Tests. Dazu ein Werkzeug,
das Karten ohne Grafik durchrechnet.

## Abschnitt 2: Sichtbar und bedienbar

Dimetrische Darstellung, Kamera mit Schieben und Zoomen, Bauplätze antippen,
Bau- und Turmmenü, Anzeige für Gold, Leben und Welle.

## Abschnitt 3: Die Grafik-Pipeline

Eigener Voxel-Renderer, 28 Sprite-Blätter in unter vier Sekunden. Zwölf Gegner,
drei Bosse, zwölf Türme in je vier Ausbaustufen, Bodenkacheln, Requisiten und
Geschosse.

## Abschnitt 4: Inhalt in die Breite

Alle zwölf Türme mit ihren Sonderfähigkeiten, alle zwölf Gegner mit ihren
Verhalten, drei Bosse mit Phasen, Schadensarten gegen Panzerungen,
Zielprioritäten, Ausbaustufen.

## Abschnitt 5: Die Systeme darüber

Loadout-Auswahl, Forschungsbaum, Meisterschaft mit 72 Spezialisierungen,
Spielstand mit Migrationen, Sterne und Schwierigkeitsgrade.

## Abschnitt 6: Alle Karten

Zehn Karten in drei Regionen, Wege von Hand entworfen, alles andere daraus
erzeugt. Sechs Mutatoren, je einer als Albtraum-Regel pro Karte.

## Abschnitt 7: Messen und Ausbalancieren

Werkzeuge für Messläufe über alle Karten und für einzelne Partien Welle für
Welle. Daraus feste Prüfungen als Regressionsschutz.

Stand: auf Normal sind alle zehn Karten zu schaffen, auf Hart acht von zehn, auf
Albtraum vier von zehn. Gemessen mit einem bewusst mittelmäßigen automatischen
Spieler, ein Mensch kommt weiter.

## Abschnitt 8: Politur

Partikel, Kettenblitze, aufsteigende Goldzahlen, Farbstich für Zustände,
Wellenansage, Bossleiste, Bildschirmerschütterung bei Durchbrüchen, Warnung bei
wenigen Leben, Vibration, erzeugter Ton und Musik je Region.

## Abschnitt 9: Endlos und Herausforderungen

Endlos-Modus nach der letzten Karte, wöchentliche Herausforderung mit fester
Karte, festem Mutator, festem Loadout und fester Zufallsfolge.

## Abschnitt 10: Auf das Gerät

Capacitor eingerichtet, Ablage des Spielstands auf dem Gerät, Hinweis auf das
Querformat, sichere Bereiche am Bildschirmrand berücksichtigt.

## Was als Nächstes sinnvoll wäre

1. **Feinschliff am Balancing.** Albtraum ist derzeit sehr hart. Das ist so
   gewollt, aber vier von zehn Karten ist die Untergrenze des Vertretbaren.
2. **Mehr Gegnerverhalten in den ersten Karten.** Die Waldsenke ist absichtlich
   ruhig. Ein weiterer Gegner mit einer klaren Eigenschaft würde ihr guttun.
3. **Eigene Modelle statt der Platzhalter-Silhouetten.** Die Wesen sind aus
   wenigen Grundformen gebaut. Wer Zeit in einzelne Modelle steckt, hebt den
   Eindruck deutlich.
4. **Eine Einführung.** Die erste Karte erklärt sich von selbst, aber ein paar
   eingeblendete Sätze beim ersten Mal würden helfen.
5. **Veröffentlichung.** Grafik und Ton sind vollständig selbst erzeugt, das
   Projekt ist damit veröffentlichungsfähig.

## Vorgehensweise

- Balance-Zahlen ändern wir in Datendateien, nie im Code.
- Nach jeder Änderung an Zahlen läuft `npm run balance`.
- `npm run doku` hält die Wertetabellen in der Dokumentation aktuell.
