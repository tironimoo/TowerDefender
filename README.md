# TowerDefender

Ein Tower-Defense-Spiel für das Handy als geknetetes Diorama. Zehn handgebaute Karten in
drei Regionen, zwölf Türme, zwölf Gegner, drei Bosse, ein Loadout aus vier
Türmen pro Karte und drei Progressionssysteme für die Zeit danach.

Grafik und Ton sind vollständig im Projekt erzeugt. Die Körper entstehen zur
Laufzeit aus Abstandsfeldern: jedes Modell ist eine Liste von Eiern, Würsten
und Kästen, aus denen eine gemeinsame Hülle gezogen wird. Die Geräusche kommen
aus Oszillatoren.

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
| `npm run balance` | Misst alle zehn Karten auf Spielbarkeit |
| `npm run verlauf` | Zeigt eine Partie Welle für Welle |
| `npm run sim` | Rechnet eine Karte durch und zeigt Schadensanteile |
| `npm run doku` | Erzeugt die Wertetabellen in `docs/` |
| `npm run icons` | Erzeugt App-Symbol und Startbild |
| `npm run app:sync` | Baut und überträgt in die App-Hülle |

## Als App auf das Gerät

Es gibt zwei Wege. Der zweite ist der zuverlässigere.

### Weg 1: Im Browser, auf den Startbildschirm gelegt

**<https://tironimoo.github.io/TowerDefender/>**

Die Seite im Browser öffnen, dann im Menü *Zum Startbildschirm hinzufügen*.
Danach startet das Spiel im Vollbild wie eine App, läuft nach dem ersten
Aufruf auch ohne Netz, und eine neue Fassung ist beim nächsten Start sofort
da — dafür sorgt ein Dienstarbeiter (`public/sw.js`), dessen Ablagefach die
Fassungsnummer im Namen trägt: neue Nummer, neues Fach, alle Dateien frisch.

Dieser Weg hat einen Vorteil, der schwerer wiegt, als er klingt: an einem
Lesezeichen kommen weder Play Protect noch Google Family Link noch ein
Fire-Tablet ohne Google Play vorbei. Wo sich eine seitlich installierte App
nicht halten lässt, funktioniert er trotzdem.

Veröffentlicht wird von `.github/workflows/web.yml` bei jedem Push.

> **Einmalig nötig, zwei Einstellungen.** Der Bauauftrag kann beide nicht
> selbst setzen, das darf sein Token nicht.
>
> 1. [Settings → Pages](https://github.com/tironimoo/TowerDefender/settings/pages):
>    bei *Build and deployment* → *Source* auf **GitHub Actions** stellen.
> 2. [Settings → Environments](https://github.com/tironimoo/TowerDefender/settings/environments)
>    → **github-pages** → *Deployment branches and tags*: auf **No
>    restriction** stellen (oder eine Regel für den Entwicklungszweig
>    anlegen). GitHub legt diese Umgebung beim ersten Mal selbst an und
>    erlaubt darin nur den Standardzweig — ein anderer Zweig wird sonst
>    abgelehnt, und zwar ohne Protokoll und ohne einen einzigen Schritt.
>
> Danach unter *Actions → Webfassung veroeffentlichen → Run workflow* einmal
> von Hand starten. Ab dann läuft es bei jedem Push von allein.

### Prototyp des neuen Stils

**<https://tironimoo.github.io/TowerDefender/prototyp/>**

Karte eins als leuchtendes Diorama in echtem 3D — dieselbe Simulation, ein
anderer Renderer. Ziehen dreht die Insel, zwei Finger zoomen, die Taste
*Qualität* schaltet zwischen drei Stufen um. Die Leiste unten zeigt Bildrate,
Gegnerzahl und Zeichenbefehle.

Das ist eine Entscheidungsgrundlage, kein Spiel: es lässt sich nicht bauen und
nicht verlieren. Die Frage ist allein, ob der Stil trägt und ob er auf einem
Handy flüssig läuft.

### Weg 2: Fertige APK herunterladen

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

Ab Bau 6 wird mit dem festen Schlüssel aus `android/schluessel` signiert, und
jeder neue Bau lässt sich über den alten drüber installieren, ohne den
Spielstand zu verlieren. Warum der Schlüssel im Repo liegt und was zu tun ist,
falls das Spiel einmal in einen Store soll, steht in
[`android/schluessel/LIESMICH.md`](android/schluessel/LIESMICH.md).

Gebaut wird sie von `.github/workflows/apk.yml`. Der Auftrag läuft bei jedem
Push auf den Entwicklungszweig und lässt sich unter Actions auch von Hand
starten.

### Wenn die App wieder verschwindet

Eine seitlich installierte App kann aus Gründen wieder vom Gerät fliegen, die
nichts mit dem Spiel zu tun haben. Der Reihe nach:

1. **Google Play Protect.** Scannt auch seitlich installierte Apps und kann sie
   entfernen. Ab Bau 7 wird eine Release-Fassung ausgeliefert statt einer
   Debug-Fassung — eine Debug-Fassung trägt `android:debuggable="true"` und
   fällt Schutzdiensten sofort auf. Falls Play Protect trotzdem meckert:
   Play Store → Profilbild → Play Protect → Einstellungen → *Apps mit Play
   Protect scannen*.
2. **Family Link oder ein anderer Kinderschutz.** Auf einem betreuten Konto
   lassen sich Apps aus unbekannten Quellen sperren und automatisch entfernen.
   Das muss im Elternkonto erlaubt werden, im Spiel lässt sich daran nichts
   ändern.
3. **Speicherkarte.** Lag die App auf einer Karte oder auf adoptivem Speicher,
   verschwand sie, sobald der Speicher nicht eingebunden war. Ab Bau 7 steht
   `android:installLocation="internalOnly"` im Manifest, die App landet also
   immer im internen Speicher.
4. **Aufräum-Apps** mancher Hersteller löschen »selten genutzte« Apps. Dort in
   die Ausnahmeliste eintragen.

### Geräte

Das Spiel läuft ab Android 7 (API 24) und ist im Querformat gesperrt. Geprüft
sind die Seitenverhältnisse vom kleinen Handy (640×360) über lange Handys
(915×412) bis zum Tablet im 4:3- und 16:10-Format (1024×768, 1280×800) — auf
allen ist die ganze Karte sichtbar und kein Bedienelement abgeschnitten. Im
Hochformat erscheint statt des Spiels der Hinweis, das Gerät zu drehen.

Der Bauauftrag prüft die fertige APK, bevor er sie veröffentlicht: Signatur
gegen den Schlüssel im Repo, die Signaturverfahren v2 und v3, Fassungsnummer,
keine Debug-Fassung, Installation nur im internen Speicher, Unterstützung
aller Bildschirmgrößen und kein Touchscreen-Zwang, der Geräte ausschließen
würde. (v1, die alte JAR-Signatur, brauchen nur Geräte vor Android 7. Das
Spiel verlangt ohnehin Android 7, deshalb lässt Gradle sie zu Recht weg.)

### Selbst bauen

```bash
# Webfassung mit Dienstarbeiter, Ergebnis in dist/
npm run build:web

# Android
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

Die Spiellogik ist strikt von der Darstellung getrennt. `src/sim` kennt Three.js
nicht und läuft ohne Browser. Das macht das Spiel testbar und erlaubt, das
Balancing zu messen statt zu raten.

| Ordner | Inhalt |
|---|---|
| `src/sim` | Spiellogik mit festem Zeitschritt, ohne Grafik |
| `src/render3d` | Darstellung mit Three.js |
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

`public/modelle/modelle.json` enthält die alten Quadermodelle. Das Spiel
braucht sie nicht mehr — es baut seine Körper aus `src/render3d/knetmodelle.ts`
—, aber der Prototyp zeigt damit den Vergleich zwischen beiden Lesarten. Neu
bauen mit `npm run modelle`.

Der Ordner `assets/` ist vom Repo ausgeschlossen. Er ist für eigene
Modellquellen gedacht, falls du den Grafiksatz austauschen willst.
