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
| Oberfläche | HTML und CSS über dem Spielfeld | Listen und Menüs sind kein Fall für eine Spiel-Bibliothek |
| Ton | WebAudio, erzeugt statt abgespielt | keine Tondateien, passt zum eckigen Stil |
| Musik | drei Stücke, im Browser komponiert (`platform/musik.ts`) | Akkordfolge plus gewürfelte Melodie, wiederholt sich nie wörtlich |
| Verpackung | Capacitor | dieselbe Codebasis wird zur iOS- und Android-App |
| Tests | Vitest | läuft ohne Browser, schnell genug für jeden Speichervorgang |
| Sichtprüfung | Playwright | fährt das Spiel im echten Browser und macht Bilder |

Das Spiel läuft immer zuerst im Browser. Capacitor kommt erst am Ende dazu.
Damit bleibt die Rückmeldeschleife kurz.

## Der wichtigste Grundsatz: Simulation getrennt von Darstellung

Die Spiellogik kennt PixiJS nicht. Kein einziger Import. Sie weiß nichts von
Sprites, Bildschirmgrößen oder Eingaben. Eine Linterregel erzwingt das.

```
Eingabe  ->  Befehle  ->  Simulation  ->  Zustand + Ereignisse  ->  Darstellung
```

Die Simulation nimmt Befehle entgegen, etwa „baue Frostturm auf Platz 7",
rechnet einen festen Zeitschritt und liefert danach ihren Zustand sowie eine
Liste von Ereignissen. Die Darstellung liest den Zustand und spielt die
Ereignisse als Bild und Ton ab.

Vier Dinge werden dadurch möglich, die sonst sehr mühsam sind:

1. Die Logik ist ohne Browser testbar.
2. Das Spiel kann tausendfach ohne Grafik durchgerechnet werden, um das
   Balancing zu messen statt zu raten.
3. Ruckler in der Darstellung verändern den Spielverlauf nicht.
4. Wiederholungen von Partien sind möglich, weil derselbe Zufall dieselbe
   Partie ergibt. Genau darauf beruht die wöchentliche Herausforderung.

Diese Trennung ist der Kern des ganzen Entwurfs. Wenn später etwas schwer
umzubauen ist, dann meistens deshalb, weil jemand sie aufgeweicht hat.

## Zeit

Die Simulation läuft mit festem Zeitschritt von sechzig Schritten pro Sekunde.
Die Darstellung läuft so schnell wie das Gerät kann.

Bei Bildratenproblemen werden höchstens fünf Schritte nachgeholt. Danach wird
Zeit verworfen. Das verhindert die Todesspirale, in der ein langsames Gerät
immer mehr nachzuholen versucht und dadurch noch langsamer wird.

Die Geschwindigkeitsschalter für doppelte und dreifache Geschwindigkeit rechnen
zwei beziehungsweise drei Simulationsschritte pro Bild. Sie beschleunigen nicht
die Zeit innerhalb eines Schrittes. Das hält das Verhalten identisch.

## Zufall

Ein gesetzter Zufallsgenerator pro Partie. In der Simulation gibt es kein
`Math.random` und kein `Date.now`. Beides wird durch eine Linterregel verboten.

## Aufbau der Simulation

Keine große Bibliothek für Entitäten. Für die erwartete Größenordnung von
einigen hundert Objekten sind einfache Listen mit Wiederverwendung schneller
geschrieben, leichter zu lesen und schnell genug.

Die Simulation besteht aus Systemen, die in fester Reihenfolge pro Schritt
laufen:

1. Wellen erzeugen Gegner
2. Gegner bewegen sich am Weg entlang
3. Zustandseffekte ticken: Brand, Verlangsamung, Fesselung, Turmstörung
4. Auren werden neu berechnet: Verstärkung, Panzerungsbruch, Aufdeckung
5. Sonderverhalten: Schilde, Heilung, Sprünge, Raserei, Bossphasen
6. Türme wählen Ziele nach ihrer Priorität und feuern
7. Geschosse fliegen und treffen
8. Schaden wird aufgelöst, Immunität, Panzerung, Schild und Verstärkung verrechnet
9. Tode werden ausgewertet, Gold vergeben, Splitter erzeugt
10. Durchgekommene Gegner ziehen Leben ab
11. Abgeräumte Wellen werden belohnt
12. Sieg oder Niederlage wird geprüft

Auren werden in jedem Schritt vollständig neu berechnet und nie aufsummiert.
Dadurch kann ein verkaufter Turm keine Wirkung hinterlassen, und es gibt keinen
Zustand, der auseinanderlaufen kann.

## Wege

Weil die Wege fest sind, brauchen wir keine Wegsuche. Jeder Weg ist ein
Linienzug aus der Kartendatei. Ein Gegner merkt sich nur, wie weit er auf
diesem Linienzug schon gelaufen ist.

Das ist wenig Code, sehr schnell und sehr robust. Es macht außerdem die
Sonderfälle einfach:

- Flieger ignorieren den Linienzug und fliegen gerade zum Ziel.
- Der Schreiter erhöht seinen Streckenwert sprunghaft.
- Der Kolbenstoß verringert ihn.
- Die Zielpriorität „Erster" ist ein Vergleich dieses einen Wertes.

## Ordnerstruktur

```
src/
  app/        Start, Spielschleife, Kamera, laufende Partie
  sim/        reine Spiellogik, kein PixiJS
    core/     Welt, Befehle, Zufall, Wege, Schritt
    systems/  die zwölf Systeme von oben
    model/    Typen
  render/     Projektion, Sprite-Blätter, Karte, Figuren, Partikel
  ui/         Menüs und Anzeige als HTML über dem Spielfeld
  data/       Türme, Gegner, Wellen, Karten, Mutatoren, Prüfung
  meta/       Spielstand, Forschung, Meisterschaft, Wochenaufgabe
  platform/   Speicher, Ton, Musik, Vibration
  shared/     Mathematik, Objektvorräte
tools/
  voxel-render/  Modelle zu Sprite-Blättern
  sim-runner/    Simulation ohne Grafik für Balancing
  preview/       Sichtprüfung im echten Browser
  doku/          erzeugt die Wertetabellen
public/atlas/    die erzeugten Sprite-Blätter
docs/            diese Dokumente
tests/
```

Zwei Regeln erzwingt der Linter: `src/sim` darf nichts aus `render`, `ui` oder
`platform` importieren, und in `src/sim` sind `Math.random` und Echtzeit
verboten.

## Musik

`platform/musik.ts` spielt keine Dateien ab, sondern komponiert. Jedes der drei
Stücke besteht aus Tempo, Tonleiter und einer Akkordfolge über vier Takte.
Bass und Fläche kommen direkt aus dem Akkord, die Melodie wird Takt für Takt
gewürfelt — aber nur aus Tönen, die zum gerade klingenden Akkord passen, und
immer in der Nähe des vorigen Tones. So entsteht eine Linie statt einer Folge
zufälliger Töne, und kein Durchlauf klingt wie der vorige.

Geplant wird im Voraus: alle 200 Millisekunden meldet der Spieler alle Töne an,
die in den nächsten anderthalb Sekunden beginnen. WebAudio spielt sie dann
exakt zur richtigen Zeit ab, auch wenn der Bildaufbau gerade stockt. Ohne diesen
Vorlauf würde die Musik bei jedem Ruckler stolpern.

Beim Start einer Karte wird ein Stück gewählt: meist das der Region, aber nie
zweimal dasselbe hintereinander.

## Oberfläche

Das Spielfeld ist PixiJS. Die Menüs sind HTML und CSS als Ebene darüber.

Begründung: Forschungsbaum, Loadout-Auswahl und Einstellungen sind Listen,
Textlayouts und Bildlaufbereiche. Das ist genau das, wofür HTML gemacht ist.
Diese Dinge in einer Spiel-Bibliothek nachzubauen kostet Wochen und wird nie so
gut. Auch das Bau- und Turmmenü ist HTML, wird aber an die Bildschirmposition
des gewählten Platzes gerechnet und klappt nach unten, wenn es oben nicht passt.

## Grafik-Pipeline

Die Modelle werden nicht von Hand gezeichnet, sondern gerendert. Der Ablauf ist
ein Skript und läuft in unter vier Sekunden durch:

1. Ein Modell besteht aus achsenparallelen Kästen mit Farbe und Drehpunkt.
2. Ein eigener kleiner Renderer bildet jede Fläche als Parallelogramm ab und
   füllt sie mit einer kleinen Textur. Dafür braucht es keine 3D-Bibliothek:
   jede orthografische Abbildung eines Rechtecks ist wieder ein Parallelogramm.
3. Feste Lichtrichtung über alle Modelle, daraus entsteht die Plastizität.
4. Jedes Bild bekommt einen dunklen Umriss, damit Figuren auf jedem Untergrund
   lesbar bleiben.
5. Die Bilder werden eng zugeschnitten und zu einem Blatt je Modell gepackt.

Ein Blatt je Modell statt eines großen: eine Karte lädt nur die vier Türme
ihres Loadouts und die Gegner ihrer Wellen. Das spart auf dem Gerät echten
Grafikspeicher.

Die erzeugten Blätter liegen im Repo, damit das Spiel nach dem Klonen sofort
startet. Neu bauen mit `npm run assets`.

## Speicherstand

Ein JSON-Objekt mit Versionsnummer. Beim Laden läuft es durch eine Kette von
Migrationsfunktionen bis zur aktuellen Version. Diese Kette wurde ab dem ersten
Tag gebaut, nicht nachträglich. Nachträglich bedeutet, dass irgendwann alle
Spielstände verloren gehen.

Fehlende Felder werden beim Laden ergänzt, ein beschädigter Stand wird durch
einen frischen ersetzt, statt das Spiel zu blockieren.

Der Zugriff läuft über eine einzige Schnittstelle, die im Browser den lokalen
Speicher und in der App die Ablage von Capacitor nutzt.

## Balancing durch Messung

Drei Werkzeuge:

- `npm run balance` rechnet alle zehn Karten mit mehreren sinnvollen Loadouts
  durch und zeigt, welche Karte kippt. Dabei wird die Stärke angesetzt, die ein
  Spieler an dieser Stelle im Spiel tatsächlich hätte.
- `npm run verlauf` zeigt eine einzelne Partie Welle für Welle: Zusammensetzung,
  Leben, Gold, Turmzahl, Durchbrüche.
- `npm run sim` rechnet eine Karte mit einem bestimmten Loadout durch und zeigt
  den Schadensanteil je Turm.

Daraus sind feste Prüfungen in `tests/balance.test.ts` geworden, die bei jeder
Änderung mitlaufen. Balancing per Gefühl ist der Punkt, an dem die meisten
Projekte dieser Art scheitern.

Der automatische Spieler in diesen Werkzeugen ist bewusst mittelmäßig: er baut
eine Grundabdeckung, lässt die Turmzahl mit der Wellennummer wachsen, baut
darüber hinaus aus und mischt die Turmtypen. Er misst damit eine Untergrenze,
kein Optimum.

## Leistung

| Größe | Ziel | Maßnahme |
|---|---|---|
| Bilder pro Sekunde | 60 auf einem Mittelklassegerät | Boden als eine Textur zwischengespeichert |
| Zeichenaufrufe | wenige | ein Blatt je Modell, Stapelverarbeitung durch PixiJS |
| Speicherzuweisungen je Schritt | keine | Gegner, Geschosse und Partikel aus Vorräten |
| Bildpunktdichte | höchstens zweifach | begrenzt beim Start |

`node tools/preview/leistung.mjs` misst die Bildrate im Gefecht in einem echten
Browser.

## Qualitätssicherung

- Typprüfung, Linter und Tests laufen über `npm run check`.
- Einheitentests für Schadensrechnung, Wegfortschritt, Zielauswahl, Wirtschaft,
  Objektvorräte und Zufall.
- Ein Test je Sonderfähigkeit von Türmen und Gegnern.
- Simulationstests für ganze Karten als Regressionsschutz beim Balancing.
- Tests für Forschung, Meisterschaft, Spielstand und Wochenaufgabe.
- Alle Inhaltsdateien werden gegen eine Prüfung gehalten, damit ein Tippfehler
  in einer Gegnerdatei sofort als klare Meldung auffällt.
