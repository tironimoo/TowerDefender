/*
 * Dienstarbeiter der Webfassung.
 *
 * Zweck ist beides zugleich: das Spiel soll ohne Netz laufen, und eine neue
 * Fassung soll beim naechsten Start sofort da sein. Beides vertraegt sich nur
 * mit einem Ablagefach je Fassung.
 *
 * Der Name des Fachs enthaelt die Fassungsnummer. Kommt eine neue Fassung,
 * entsteht ein neues Fach, die alten werden geloescht, und damit werden auch
 * Dateien neu geholt, deren Name sich nicht geaendert hat - die Sprite-Blaetter
 * etwa heissen immer gleich. Innerhalb einer Fassung wird nur aus dem Fach
 * bedient, das ist schnell und funktioniert ohne Netz.
 *
 * Die beiden Platzhalter setzt tools/web/pwa.mjs nach dem Bau ein.
 */

const FASSUNG = '__FASSUNG__';
const SPEICHER = `towerdefender-${FASSUNG}`;
/** Was sofort beim Einrichten geholt wird. Ohne das startet das Spiel nicht. */
const GERUEST = __GERUEST__;
/** Der Rest. Fehlschlaege sind hier verschmerzbar, er kommt sonst spaeter. */
const REST = __REST__;

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      const speicher = await caches.open(SPEICHER);
      // Das Geruest muss vollstaendig ankommen, sonst ist die Fassung kaputt.
      await speicher.addAll(GERUEST);
      // Der Rest darf scheitern, etwa bei wackligem Netz. Was fehlt, wird beim
      // Spielen nachgeladen und dann abgelegt.
      await Promise.all(
        REST.map((pfad) => speicher.add(pfad).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== SPEICHER) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  ereignis.respondWith(
    (async () => {
      const speicher = await caches.open(SPEICHER);
      // ignoreVary ist noetig, nicht bequem: der Server schickt "Vary: Origin",
      // und die gebauten Skripte laedt die Seite mit crossorigin, also mit
      // Origin-Kopfzeile. Beim Ablegen hatte die Anfrage keine. Ohne ignoreVary
      // findet die Ablage die Datei deshalb nicht wieder, und das Spiel startet
      // ohne Netz nicht - mit Netz faellt es nie auf.
      const abgelegt = await speicher.match(anfrage, {
        ignoreSearch: true,
        ignoreVary: true,
      });
      if (abgelegt !== undefined) return abgelegt;

      try {
        const antwort = await fetch(anfrage);
        if (antwort.ok && antwort.type === 'basic') {
          await speicher.put(anfrage, antwort.clone());
        }
        return antwort;
      } catch (fehler) {
        // Ohne Netz und ohne Ablage: wenigstens die Startseite liefern, damit
        // ein Sprung im Verlauf nicht auf einer Fehlerseite endet.
        if (anfrage.mode === 'navigate') {
          const start = await speicher.match('index.html', { ignoreVary: true });
          if (start !== undefined) return start;
        }
        throw fehler;
      }
    })(),
  );
});
