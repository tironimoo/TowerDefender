# Signaturschluessel

Android erlaubt ein Update nur, wenn die neue APK mit demselben Schluessel
signiert ist wie die installierte. Ohne festen Schluessel legt Gradle auf jedem
Bau-Laeufer einen neuen an — jede APK gilt dann als App eines fremden
Herausgebers, und das Update bricht ab.

`towerdefender.keystore` ist dieser feste Schluessel. Er liegt bewusst im Repo,
damit jeder Bau gleich signiert und sich neue Fassungen einfach druebersetzen
lassen.

| | |
|---|---|
| Alias | `towerdefender` |
| Passwort (Speicher und Schluessel) | `towerdefender` |
| Gueltig bis | 2056 |

## Wenn das Spiel einmal in einen Store soll

Dann gehoert dieser Schluessel ersetzt. Ein Schluessel, der oeffentlich im Repo
liegt, taugt nicht als Nachweis, dass ein Update wirklich von dir kommt. Der
Weg dahin:

1. Neuen Schluessel erzeugen und **nicht** ins Repo legen:
   `keytool -genkeypair -keystore release.keystore -alias towerdefender -keyalg RSA -keysize 2048 -validity 10950`
2. Ihn als Datei nach Base64 wandeln und in den GitHub-Einstellungen unter
   *Secrets and variables → Actions* als `KEYSTORE_BASE64` hinterlegen, dazu
   `KEYSTORE_PASSWORD` und `KEY_ALIAS`.
3. Im Bauauftrag die Datei vor dem Bau aus dem Secret schreiben.

Wichtig: Diesen Schluessel danach sichern. Geht er verloren, laesst sich die
App im Store nie wieder aktualisieren.
