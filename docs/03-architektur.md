# Architektur

Dieses Dokument beschreibt den technischen Aufbau. Es richtet sich an jemanden,
der programmieren lernt, und begründet deshalb jede Entscheidung statt sie nur
zu nennen.

## Technischer Unterbau

| Baustein | Wahl | Grund |
|---|---|---|
| Sprache | TypeScript, strikter Modus | Fehler fallen beim Schreiben auf, nicht im Spiel |
| Bauwerkzeug | Vite | startet sofort, lädt Änderungen live nach |
| Darstellung | PixiJS 8 | schnelle 2D-Grafik über die Grafikkarte |
| Verpackung | Capacitor | dieselbe Codebasis wird zur iOS- und Android-App |
| Tests | Vitest | läuft ohne Browser, schnell genug für jeden Speichervorgang |
| Karteneditor | Tiled | Wege und Bauplätze visuell setzen, exportiert JSON |

Das Spiel läuft immer zuerst im Browser. Capacitor kommt erst dazu, wenn es
sich gut anfühlt. Damit bleibt die Rückmeldeschleife kurz.

## Der wichtigste Grundsatz: Simulation getrennt von Darstellung

Die Spiellogik kennt PixiJS nicht. Kein einziger Import. Sie weiß nichts von
Sprites, Bildschirmgrößen oder Eingaben.

```
Eingabe  ->  Befehle  ->  Simulation  ->  Zustand + Ereignisse  ->  Darstellung
```

Die Simulation nimmt Befehle entgegen, etwa "baue Frostturm auf Platz 7",
rechnet einen festen Zeitschritt und liefert danach ihren Zustand sowie eine
Liste von Ereignissen. Die Darstellung liest den Zustand und spielt die
Ereignisse als Bild und Ton ab.

Vier Dinge werden dadurch möglich, die sonst sehr mühsam sind:

1. Die Logik ist ohne Browser testbar.
2. Das Spiel kann tausendfach ohne Grafik durchgerechnet werden, um das
   Balancing zu messen statt zu raten.
3. Ruckler in der Darstellung verändern den Spielverlauf nicht.
4. Wiederholungen von Partien sind möglich, weil derselbe Zufall dieselbe
   Partie ergibt.

Diese Trennung ist der Kern des ganzen Entwurfs. Wenn später etwas schwer
umzubauen ist, dann meistens deshalb, weil jemand sie aufgeweicht hat.

## Zeit

Die Simulation läuft mit festem Zeitschritt von sechzig Schritten pro Sekunde.
Die Darstellung läuft so schnell wie das Gerät kann und rechnet zwischen zwei
Simulationsschritten weich um.

Bei Bildratenproblemen werden höchstens fünf Schritte nachgeholt. Danach wird
Zeit verworfen. Das verhindert die Todesspirale, in der ein langsames Gerät
immer mehr nachzuholen versucht und dadurch noch langsamer wird.

Die Geschwindigkeitsschalter für doppelte und dreifache Geschwindigkeit rechnen
zwei beziehungsweise drei Simulationsschritte pro Bild. Sie beschleunigen nicht
die Zeit innerhalb eines Schrittes. Das hält das Verhalten identisch.

## Zufall

Ein gesetzter Zufallsgenerator pro Partie. In der Simulation gibt es kein
`Math.random` und kein `Date.now`. Beides wird durch eine Prüfregel im
Linter verboten.

Der Ausgangswert wird im Spielstand abgelegt. Damit sind Wiederholungen, die
wöchentliche Herausforderung und reproduzierbare Fehlerberichte möglich.

## Aufbau der Simulation

Keine große Bibliothek für Entitäten. Für die erwartete Größenordnung von
einigen hundert Objekten sind einfache Listen mit Wiederverwendung schneller
geschrieben, leichter zu lesen und schnell genug.

Die Simulation besteht aus Systemen, die in fester Reihenfolge pro Schritt
laufen:

1. Wellen erzeugen Gegner
2. Gegner bewegen sich am Weg entlang
3. Zustandseffekte ticken, also Brand, Verlangsamung, Fesselung
4. Türme wählen Ziele nach ihrer Priorität
5. Türme feuern, Abklingzeiten laufen
6. Geschosse fliegen und treffen
7. Schaden wird aufgelöst, Panzerung und Widerstände verrechnet
8. Tode werden ausgewertet, Gold und Erfahrung vergeben
9. Durchgekommene Gegner ziehen Leben ab
10. Sieg oder Niederlage wird geprüft
11. Ereignisse werden nach außen gegeben

Feste Reihenfolge bedeutet: gleicher Eingang ergibt gleichen Ausgang. Ohne das
gibt es keine Reproduzierbarkeit.

## Wege

Weil die Wege fest sind, brauchen wir keine Wegsuche. Jeder Weg ist ein
Linienzug aus der Kartendatei. Ein Gegner merkt sich nur, wie weit er auf
diesem Linienzug schon gelaufen ist. Position und Blickrichtung ergeben sich
daraus.

Das ist wenig Code, sehr schnell und sehr robust. Es macht außerdem die
Sonderfälle einfach:

- Flieger ignorieren den Linienzug und fliegen gerade zum Ziel.
- Der Schreiter erhöht seinen Streckenwert sprunghaft.
- Der Kolbenstoß verringert ihn.
- Die Zielpriorität "Erster" ist ein Vergleich dieses einen Wertes.

Karten mit mehreren Eingängen haben mehrere Linienzüge. Mehr ist nicht nötig.

## Schadensmodell

```
Schaden = Grundwert
        * Widerstand[Panzerung][Schadensart]
        * (1 + Verstärkung)
        - Restpanzerung
```

Alle Werte stehen in Datendateien. Kein Zahlenwert für Balance steht im Code.
Das klingt nach einer Kleinigkeit und ist der Unterschied zwischen einem
Balancing-Durchgang von zehn Minuten und einem von zwei Tagen.

## Ordnerstruktur

```
src/
  app/        Start, Spielschleife, Szenenwechsel
  sim/        reine Spiellogik, kein PixiJS
    core/     Welt, Objektlisten, Zufall, Zeit
    systems/  die elf Systeme von oben
    model/    Typen
  render/     PixiJS-Ansichten, Partikel, Kamera
  ui/         Menüs als HTML-Ebene über dem Spielfeld
  data/       Türme, Gegner, Wellen, Level, Balance
  meta/       Spielstand, Forschung, Meisterschaft
  platform/   Speicher, Ton, Vibration, Capacitor
  shared/     Mathematik, Ereignisse, Hilfsfunktionen
tools/
  voxel-render/  Modelle zu Sprite-Blättern
  atlas/         Sprite-Blätter packen
  sim-runner/    Simulation ohne Grafik für Balancing
assets/          Grafiken, nicht im Repo
docs/            diese Dokumente
tests/
```

Eine Regel dazu wird durch den Linter erzwungen: `sim/` darf nichts aus
`render/`, `ui/` oder `platform/` importieren.

## Oberfläche

Das Spielfeld ist PixiJS. Die Menüs sind HTML und CSS als Ebene darüber.

Begründung: Forschungsbaum, Loadout-Auswahl und Einstellungen sind Listen,
Textlayouts und Bildlaufbereiche. Das ist genau das, wofür HTML gemacht ist.
Diese Dinge in einer Spiel-Bibliothek nachzubauen kostet Wochen und wird nie so
gut. Die Anzeige während des Spiels, also Gold, Leben, Wellenzähler und das
Ringmenü am Bauplatz, liegt dagegen in PixiJS, weil sie sich mit der Kamera
bewegen und zum Spielfeld passen muss.

## Grafik-Pipeline

Die Modelle werden nicht von Hand gezeichnet, sondern gerendert. Der Ablauf ist
ein Skript und läuft automatisch:

1. Ein Voxel-Modell liegt als Datei vor, zusammen mit seiner Textur.
2. Ein kleines Programm stellt es in eine Szene mit festem Licht, fester
   Kamera und festem Schattenwurf.
3. Es wird aus acht Richtungen und über alle Bewegungsphasen abfotografiert.
4. Alle Bilder werden zu einem Sprite-Blatt pro Region gepackt.
5. Das Spiel lädt nur die fertigen Blätter.

Vorteile: einheitliche Beleuchtung über alle Objekte, sofortiges Neurendern bei
Stiländerungen, und die Laufzeit bleibt reine 2D-Last.

Die Quelldateien liegen in `assets/` und sind über `.gitignore` vom Repo
ausgeschlossen. Geladen wird über eine Manifest-Datei, die Modelle auf
Spielobjekte abbildet. Ein späterer Wechsel des Grafiksatzes ist damit ein
Austausch dieses Ordners und nicht ein Umbau des Spiels.

## Speicherstand

Ein JSON-Objekt mit Versionsnummer. Beim Laden läuft es durch eine Kette von
Migrationsfunktionen bis zur aktuellen Version. Diese Kette wird ab dem ersten
Tag gebaut, nicht nachträglich. Nachträglich bedeutet, dass irgendwann alle
Spielstände verloren gehen.

Gespeichert werden Forschung, Meisterschaft, Sterne, Loadout-Vorlagen,
Bestwerte im Endlos-Modus und Einstellungen. Der Zugriff läuft über eine einzige
Schnittstelle, die im Browser den lokalen Speicher und auf dem Gerät die
Capacitor-Ablage nutzt.

## Balancing durch Messung

Das Werkzeug `sim-runner` startet die Simulation ohne jede Grafik. Ein Aufruf
rechnet ein Level mit einem bestimmten Loadout hundertfach durch und gibt aus:

- wie oft gewonnen wurde
- wie viele Gegner durchkamen und in welcher Welle
- der Goldverlauf über die Zeit
- welcher Turm welchen Anteil am Schaden hatte
- wie lange jeder Gegnertyp im Schnitt überlebte

Daraus werden feste Prüfungen, die bei jeder Änderung mitlaufen. Zum Beispiel:
Level 1 muss mit dem Anfangs-Loadout zuverlässig zu gewinnen sein. Level 10 darf
mit keinem einzelnen Turm allein zu gewinnen sein. Kein Turm darf über alle Level
hinweg mehr als ein Drittel des Schadens stellen.

Das ist der eigentliche Grund für die Trennung von Simulation und Darstellung.
Balancing per Gefühl ist der Punkt, an dem die meisten Projekte dieser Art
scheitern.

## Leistungsziele

| Größe | Ziel |
|---|---|
| Bilder pro Sekunde | 60 auf einem Mittelklasse-Android |
| gleichzeitige Gegner | bis 250 |
| gleichzeitige Geschosse | bis 400 |
| Zeichenaufrufe für Spielobjekte | wenige, durch ein Blatt pro Region |
| Speicherzuweisungen pro Schritt | keine, alles wiederverwendet |

Gegner, Geschosse und Partikel werden aus Vorräten entnommen und zurückgegeben,
statt neu erzeugt zu werden. Das vermeidet Ruckler durch die Speicherbereinigung
und ist einer der wenigen Punkte, an denen sich Vorsorge von Anfang an wirklich
lohnt.

## Qualitätssicherung

- Typprüfung und Linter laufen vor jedem Speichern.
- Einheitentests für Schadensrechnung, Wegfortschritt, Zielauswahl, Wirtschaft.
- Simulationstests für ganze Level als Regressionsschutz beim Balancing.
- Alle Inhaltsdateien werden gegen ein Schema geprüft, damit ein Tippfehler in
  einer Gegnerdatei sofort auffällt und nicht als seltsames Verhalten endet.
