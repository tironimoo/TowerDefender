# TowerDefender

Ein Tower-Defense-Spiel für Handy im Klotz-Stil. Zehn handgebaute Karten in drei
Regionen, zwölf Türme, ein Loadout aus vier Türmen pro Karte, und drei
Progressionssysteme für die Zeit nach dem Durchspielen.

Aktueller Stand: Konzeptphase. Es wird noch nicht programmiert.

## Dokumente

| Datei | Inhalt |
|---|---|
| [docs/01-konzept.md](docs/01-konzept.md) | Spielkonzept, Stil, Regionen, Gegner, Türme, Bedienung |
| [docs/02-progression.md](docs/02-progression.md) | Loadout, Forschung, Meisterschaft, Sterne, Verlauf |
| [docs/03-architektur.md](docs/03-architektur.md) | Technischer Aufbau und Begründungen |
| [docs/04-fahrplan.md](docs/04-fahrplan.md) | Reihenfolge der Umsetzung |
| [docs/05-startwerte.md](docs/05-startwerte.md) | Startwerte für Türme, Gegner und Wirtschaft |

## Technik

TypeScript, PixiJS für die Darstellung, Capacitor für die App auf iOS und
Android. Die Spiellogik ist vollständig von der Darstellung getrennt und ohne
Browser testbar.

## Grafikdateien

Der Ordner `assets/` ist vom Repo ausgeschlossen. Das Spiel lädt Grafiken über
eine Manifest-Datei, die Modelle auf Spielobjekte abbildet. Der Grafiksatz ist
dadurch austauschbar, ohne den Code zu berühren.
