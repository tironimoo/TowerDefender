# TowerDefender

Ein Tower-Defense-Spiel für das Handy im Klotz-Stil. Zehn handgebaute Karten in
drei Regionen, zwölf Türme, zwölf Gegner, drei Bosse, ein Loadout aus vier
Türmen pro Karte und drei Progressionssysteme für die Zeit danach.

Grafik und Ton sind vollständig im Projekt erzeugt: die Sprite-Blätter kommen
aus einem eigenen Voxel-Renderer, die Geräusche aus Oszillatoren.

## Schnellstart

```bash
npm install
npm run dev
```

Dann die angezeigte Adresse im Browser öffnen, am besten im Querformat. Auf dem
Handy funktioniert dieselbe Adresse im WLAN.

## Befehle

| Befehl | Was er tut |
|---|---|
| `npm run dev` | Entwicklungsserver mit sofortiger Aktualisierung |
| `npm run build` | Fertige Fassung nach `dist/` |
| `npm run check` | Typprüfung, Linter und alle Tests |
| `npm test` | Nur die Tests |
| `npm run assets` | Baut die Sprite-Blätter neu |
| `npm run balance` | Misst alle zehn Karten auf Spielbarkeit |
| `npm run verlauf` | Zeigt eine Partie Welle für Welle |
| `npm run sim` | Rechnet eine Karte durch und zeigt Schadensanteile |
| `npm run doku` | Erzeugt die Wertetabellen in `docs/` |
| `npm run app:sync` | Baut und überträgt in die App-Hülle |

## Als App auf das Gerät

```bash
npm run build
npx cap add android      # einmalig, braucht Android Studio
npx cap add ios          # einmalig, braucht Xcode
npm run app:android      # oder app:ios
```

## Aufbau

Die Spiellogik ist strikt von der Darstellung getrennt. `src/sim` kennt PixiJS
nicht und läuft ohne Browser. Das macht das Spiel testbar und erlaubt, das
Balancing zu messen statt zu raten.

| Ordner | Inhalt |
|---|---|
| `src/sim` | Spiellogik mit festem Zeitschritt, ohne Grafik |
| `src/render` | Darstellung mit PixiJS |
| `src/ui` | Menüs und Anzeige als HTML |
| `src/data` | Türme, Gegner, Wellen, Karten, Mutatoren |
| `src/meta` | Spielstand, Forschung, Meisterschaft |
| `tools` | Grafik-Pipeline, Messwerkzeuge, Sichtprüfung |

## Dokumente

| Datei | Inhalt |
|---|---|
| [docs/01-konzept.md](docs/01-konzept.md) | Spielkonzept, Stil, Regionen, Gegner, Türme, Bedienung |
| [docs/02-progression.md](docs/02-progression.md) | Loadout, Forschung, Meisterschaft, Sterne, Verlauf |
| [docs/03-architektur.md](docs/03-architektur.md) | Technischer Aufbau und Begründungen |
| [docs/04-fahrplan.md](docs/04-fahrplan.md) | Was entstanden ist und was als Nächstes sinnvoll wäre |
| [docs/05-startwerte.md](docs/05-startwerte.md) | Alle Werte, erzeugt aus den Daten |

## Grafikdateien

`public/atlas/` enthält die erzeugten Sprite-Blätter und gehört ins Repo, damit
das Spiel nach dem Klonen sofort startet. Neu bauen mit `npm run assets`.

Der Ordner `assets/` ist vom Repo ausgeschlossen. Er ist für eigene
Modellquellen gedacht, falls du den Grafiksatz austauschen willst.
