/**
 * Mutatoren.
 *
 * Auf Albtraum traegt jede Karte einen eigenen Mutator, der sie inhaltlich
 * veraendert statt nur die Zahlen zu erhoehen. Dieselben Mutatoren tragen
 * spaeter die woechentliche Herausforderung. Siehe docs/02-progression.md.
 */

import type { MutatorDef } from '@sim/model/types';

function mutator(teil: Partial<MutatorDef> & { id: string; name: string; beschreibung: string }): MutatorDef {
  return {
    healthFactor: 1,
    speedFactor: 1,
    goldFactor: 1,
    schildAnteil: 0,
    ausbauKosten: 1,
    turmReichweite: 1,
    keineVorbereitung: false,
    ...teil,
  };
}

export const MUTATOR_DEFS: readonly MutatorDef[] = [
  mutator({
    id: 'gepanzert',
    name: 'Gepanzert',
    beschreibung: 'Jeder Gegner startet mit einem Schild von einem Drittel seines Lebens.',
    schildAnteil: 0.34,
  }),
  mutator({
    id: 'teuer',
    name: 'Knappe Kasse',
    beschreibung: 'Ausbauten kosten das Doppelte.',
    ausbauKosten: 2,
  }),
  mutator({
    id: 'hetze',
    name: 'Hetze',
    beschreibung: 'Keine Bauphase vor der ersten Welle, und alle Gegner sind schneller.',
    keineVorbereitung: true,
    speedFactor: 1.25,
  }),
  mutator({
    id: 'kurzsichtig',
    name: 'Kurzsichtig',
    beschreibung: 'Alle Tuerme haben ein Viertel weniger Reichweite.',
    turmReichweite: 0.75,
  }),
  mutator({
    id: 'zaeh',
    name: 'Zaeh',
    beschreibung: 'Gegner haben die Haelfte mehr Leben, geben dafuer mehr Gold.',
    healthFactor: 1.5,
    goldFactor: 1.2,
  }),
  mutator({
    id: 'duerre',
    name: 'Duerre',
    beschreibung: 'Ein Drittel weniger Gold aus allen Quellen.',
    goldFactor: 0.66,
  }),
];
