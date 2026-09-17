import { describe, expect, it } from 'vitest';
import { buildRoute, positionOnRoute, routeLengthFor } from '@sim/index';

const ecke = buildRoute([
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 5 },
]);

describe('Wege', () => {
  it('berechnet die Gesamtlaenge', () => {
    expect(ecke.totalLength).toBeCloseTo(15);
  });

  it('kennt die Luftlinie fuer Flieger', () => {
    expect(ecke.straightLength).toBeCloseTo(Math.hypot(10, 5));
  });

  it('liefert Anfang und Ende an den Grenzen', () => {
    const position = { x: 0, y: 0 };
    positionOnRoute(ecke, 0, false, position);
    expect(position).toEqual({ x: 0, y: 0 });
    positionOnRoute(ecke, 999, false, position);
    expect(position).toEqual({ x: 10, y: 5 });
  });

  it('interpoliert innerhalb eines Segments', () => {
    const position = { x: 0, y: 0 };
    positionOnRoute(ecke, 5, false, position);
    expect(position.x).toBeCloseTo(5);
    expect(position.y).toBeCloseTo(0);
    positionOnRoute(ecke, 12.5, false, position);
    expect(position.x).toBeCloseTo(10);
    expect(position.y).toBeCloseTo(2.5);
  });

  it('laesst Flieger die Luftlinie nehmen', () => {
    const position = { x: 0, y: 0 };
    positionOnRoute(ecke, ecke.straightLength / 2, true, position);
    expect(position.x).toBeCloseTo(5);
    expect(position.y).toBeCloseTo(2.5);
  });

  it('nutzt fuer Flieger die kuerzere Strecke', () => {
    expect(routeLengthFor(ecke, true)).toBeLessThan(routeLengthFor(ecke, false));
  });

  it('lehnt einen Weg mit weniger als zwei Punkten ab', () => {
    expect(() => buildRoute([{ x: 0, y: 0 }])).toThrow();
  });
});
