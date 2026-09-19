/**
 * Anmeldung des Dienstarbeiters fuer die Webfassung.
 *
 * Die Webfassung gibt es, weil sich eine APK nicht auf jedes Geraet bringen
 * laesst: Kinderschutz und Schutzdienste entfernen seitlich installierte Apps
 * mitunter wieder. Ein Lesezeichen auf dem Startbildschirm betrifft das nicht.
 *
 * Wichtig ist dabei, dass eine neue Fassung sofort ankommt. Der Dienstarbeiter
 * uebernimmt deshalb sofort (skipWaiting und claim in sw.js), und hier wird die
 * Seite einmal neu geladen, sobald das passiert. Ohne das Neuladen liefe die
 * alte Fassung noch bis zum uebernaechsten Start weiter.
 */

export function meldeDienstarbeiterAn(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  // Gab es vorher schon einen, ist der Wechsel ein Update. Beim allerersten
  // Besuch waere das Neuladen nur ein Flackern ohne Nutzen.
  const hatteSchonEinen = navigator.serviceWorker.controller !== null;
  let laedtNeu = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteSchonEinen || laedtNeu) return;
    laedtNeu = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('sw.js')
      .then((anmeldung) => {
        // Bei jedem Start nachsehen, ob es etwas Neues gibt.
        void anmeldung.update();
      })
      .catch(() => {
        // Ohne Dienstarbeiter laeuft das Spiel weiter, nur eben nicht offline.
      });
  });
}
