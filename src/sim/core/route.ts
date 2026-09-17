/**
 * Wege.
 *
 * Weil die Gegnerwege fest zur Karte gehoeren, braucht das Spiel keine
 * Wegsuche. Jeder Weg ist ein Linienzug. Ein Gegner merkt sich nur, wie weit
 * er darauf schon gelaufen ist. Siehe docs/03-architektur.md, Abschnitt Wege.
 */

import type { Vec2 } from '@shared/math';
import type { Route } from '../model/types';

export function buildRoute(points: readonly Vec2[]): Route {
  if (points.length < 2) {
    throw new Error('Ein Weg braucht mindestens zwei Punkte.');
  }

  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    if (previous === undefined || current === undefined) {
      throw new Error('Weg enthaelt eine Luecke.');
    }
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
    cumulative.push(total);
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error('Weg ohne Anfang oder Ende.');
  }

  return {
    points,
    cumulative,
    totalLength: total,
    straightLength: Math.hypot(last.x - first.x, last.y - first.y),
  };
}

export interface RoutePosition {
  x: number;
  y: number;
}

/**
 * Position nach einer zurueckgelegten Strecke.
 *
 * Fuer Flieger wird der Linienzug ignoriert und die Luftlinie vom Anfang zum
 * Ende benutzt. Dadurch braucht der Flieger keine eigene Wegdarstellung.
 */
export function positionOnRoute(
  route: Route,
  travelled: number,
  flying: boolean,
  out: RoutePosition,
): void {
  const first = route.points[0];
  const last = route.points[route.points.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error('Weg ohne Anfang oder Ende.');
  }

  if (flying) {
    const t = route.straightLength === 0 ? 1 : Math.min(1, travelled / route.straightLength);
    out.x = first.x + (last.x - first.x) * t;
    out.y = first.y + (last.y - first.y) * t;
    return;
  }

  if (travelled <= 0) {
    out.x = first.x;
    out.y = first.y;
    return;
  }
  if (travelled >= route.totalLength) {
    out.x = last.x;
    out.y = last.y;
    return;
  }

  // Segment suchen. Binaere Suche, damit auch lange Wege guenstig bleiben.
  let low = 0;
  let high = route.cumulative.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    const value = route.cumulative[middle];
    if (value === undefined) break;
    if (value <= travelled) low = middle;
    else high = middle;
  }

  const startDistance = route.cumulative[low] ?? 0;
  const endDistance = route.cumulative[high] ?? startDistance;
  const from = route.points[low];
  const to = route.points[high];
  if (from === undefined || to === undefined) {
    throw new Error('Weg enthaelt eine Luecke.');
  }

  const segmentLength = endDistance - startDistance;
  const t = segmentLength === 0 ? 0 : (travelled - startDistance) / segmentLength;
  out.x = from.x + (to.x - from.x) * t;
  out.y = from.y + (to.y - from.y) * t;
}

/** Die Strecke, die ein Gegner auf dieser Route zuruecklegen muss. */
export function routeLengthFor(route: Route, flying: boolean): number {
  return flying ? route.straightLength : route.totalLength;
}
