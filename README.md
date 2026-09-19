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
| `npm run icons` | Erzeugt App-Symbol und Startbild |
| `npm run app:sync` | Baut und überträgt in die App-Hülle |

## Als App auf das Gerät

### Fertige APK herunterladen

Die aktuelle Testfassung liegt immer unter derselben Adresse:

**<https://github.com/tironimoo/TowerDefender/releases/tag/apk-latest>**

Auf dem Handy herunterladen, antippen und die Installation aus unbekannter
Quelle einmalig erlauben.

> **Einmalig nötig, wenn du Bau 1 bis 4 installiert hast:** diese Fassungen
> wurden bei jedem Bau mit einem neu erzeugten Schlüssel signiert. Android
> erlaubt ein Update nur bei gleicher Signatur, das Update bricht dort also
> ab. Alte App einmal deinstallieren, dann die neue installieren. Der
> Spielstand geht dabei verloren — leider unvermeidbar, ein Umweg darum
> existiert nicht.

Ab Bau 5 wird mit dem festen Schlüssel aus `android/schluessel` signiert, und
jeder neue Bau lässt sich über den alten drüber installieren, ohne den
Spielstand zu verlieren. Warum der Schlüssel im Repo liegt und was zu tun ist,
falls das Spiel einmal in einen Store soll, steht in
[`android/schluessel/LIESMICH.md`](android/schluessel/LIESMICH.md).

Gebaut wird sie von `.github/workflows/apk.yml`. Der Auftrag läuft bei jedem
Push auf den Entwicklungszweig und lässt sich unter Actions auch von Hand
starten. Ein Schritt im Auftrag vergleicht die Signatur der fertigen APK mit
dem Schlüssel im Repo — ein falsch signierter Bau soll nicht erst auf dem
Handy auffallen.

### Selbst bauen

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# Ergebnis: android/app/build/outputs/apk/debug/app-debug.apk
```

Dafür brauchst du ein Android-SDK. Mit Android Studio geht auch
`npm run app:android`. Für iOS einmalig `npx cap add ios`, dann
`npm run app:ios`.

Das Android-Projekt liegt im Repo. Dort sind Querformat, Vollbild ohne
Systemleisten, die Vibrationsberechtigung und das App-Symbol eingestellt. Das
Symbol erzeugt `npm run icons` mit demselben Voxel-Renderer wie die
Spielgrafik.

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
