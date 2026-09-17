# Fahrplan

Die Reihenfolge ist so gewählt, dass nach jedem Abschnitt etwas Spielbares
vorliegt. Kein Abschnitt baut wochenlang an etwas, das man nicht anfassen kann.

## Abschnitt 0: Gerüst

Projekt mit Vite und TypeScript, PixiJS eingebunden, Linterregeln, Vitest,
leeres Spielfeld im Browser. Ziel ist eine funktionierende Schleife aus
Ändern und sofort Sehen.

Ergebnis: ein Klotz bewegt sich über den Bildschirm.

## Abschnitt 1: Der Kern ohne Grafik

Simulation mit festem Zeitschritt, Wegfortschritt, ein Turm, ein Gegner,
Schaden, Gold, Leben. Vollständig ohne PixiJS, geprüft durch Tests.

Ergebnis: ein Test zeigt, dass zehn Gegner von einem Turm aufgehalten werden.
Noch nichts zu sehen, aber das Fundament steht richtig.

## Abschnitt 2: Sichtbar und bedienbar

Darstellung, Kamera mit Ziehen und Zoomen, Bauplätze antippen, Ringmenü,
Anzeige für Gold, Leben und Welle. Platzhaltergrafik aus einfachen Formen.

Ergebnis: Level 1 ist von Anfang bis Ende spielbar. Hässlich, aber echt.

## Abschnitt 3: Die Grafik-Pipeline

Das Renderwerkzeug für Voxel-Modelle, das Packen der Sprite-Blätter, das
Manifest. Danach Level 1 mit echter Grafik, Schatten, Partikeln und Ton.

Ergebnis: der erste Stand, der aussieht wie das fertige Spiel. Dieser Abschnitt
ist der Prüfstein für den Qualitätsanspruch. Wenn Level 1 hier nicht gut
aussieht, stimmt der Stil noch nicht, und das klären wir vor allem anderen.

## Abschnitt 4: Inhalt in die Breite

Alle zwölf Türme, alle zwölf Gegner, Schadensarten und Panzerungen,
Zielprioritäten, Ausbaustufen und Gabelungen. Alles aus Datendateien.

Ergebnis: das Spiel hat seinen vollen taktischen Werkzeugkasten.

## Abschnitt 5: Die Systeme darüber

Loadout-Auswahl, Forschungsbaum, Meisterschaft, Spielstand mit Migrationen,
schrittweises Öffnen der Systeme für neue Spieler.

Ergebnis: Fortschritt bleibt über Sitzungen hinweg erhalten.

## Abschnitt 6: Alle Karten

Level 2 bis 10, die drei Regionen mit eigenen Paletten, die drei Bosse,
Sternewertung, Schwierigkeitsgrade.

Ergebnis: das Spiel ist inhaltlich vollständig.

## Abschnitt 7: Messen und Ausbalancieren

Das Werkzeug für die Simulation ohne Grafik, die festen Prüfungen, mehrere
Durchgänge am Zahlenwerk.

Ergebnis: die Schwierigkeitskurve stimmt, und sie bleibt es auch nach
Änderungen.

## Abschnitt 8: Politur

Bildschirmerschütterung, Trefferblitze, Zeitlupe beim Bosstod, Übergänge,
Vibration, Ton- und Musikebenen, Menüanimationen.

Dieser Abschnitt wird gern unterschätzt. Er entscheidet, ob sich das Spiel
teuer anfühlt, und er braucht ungefähr so lange wie Abschnitt 4.

## Abschnitt 9: Endlos und Herausforderungen

Endlos-Modus, Mutatoren, wöchentliche Herausforderung, Bestenliste gegen sich
selbst.

## Abschnitt 10: Auf das Gerät

Capacitor einrichten, Bildschirmausschnitte und Rundungen berücksichtigen,
Leistung auf echten Geräten messen, Symbole und Startbildschirm.

Ergebnis: eine installierbare App auf deinem Handy.

## Vorgehensweise

- Nach jedem Abschnitt gibt es einen spielbaren Stand im Browser, den du sofort
  auf dem Handy öffnen kannst.
- Balance-Zahlen ändern wir in Datendateien, nie im Code.
- Neue Inhalte kommen erst dazu, wenn das Vorhandene sich gut anfühlt. Zehn gute
  Karten schlagen zwanzig mittelmäßige deutlich.
