/**
 * Fassungsnummer.
 *
 * Steht im Hauptmenue, damit sich zu einem Bildschirmfoto oder einem Bericht
 * sagen laesst, welche Fassung darauf zu sehen ist. Ohne diese Angabe raet man
 * bei jeder Rueckmeldung, ob sie sich auf den aktuellen Stand bezieht.
 *
 * Der Wert kommt beim Bauen aus VITE_FASSUNG. Die Bauauftraege setzen dort die
 * Baunummer samt Herkunft ("App 1.0.12" oder "Web 1.0.6"), weil App und
 * Webfassung getrennt gezaehlt werden und sonst zwei verschiedene Staende
 * dieselbe Nummer truegen.
 */

const AUS_DEM_BAU: unknown = (import.meta.env as Record<string, unknown>)['VITE_FASSUNG'];

export const FASSUNG: string =
  typeof AUS_DEM_BAU === 'string' && AUS_DEM_BAU.length > 0 ? AUS_DEM_BAU : 'Entwicklung';
