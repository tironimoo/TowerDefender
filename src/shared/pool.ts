/**
 * Einfacher Objektvorrat.
 *
 * Gegner, Geschosse und Partikel werden nicht neu erzeugt, sondern aus einem
 * Vorrat entnommen und zurueckgegeben. Das vermeidet Ruckler durch die
 * Speicherbereinigung. Siehe docs/03-architektur.md, Abschnitt Leistungsziele.
 *
 * Die Reihenfolge der Eintraege in `items` bleibt stabil. Systeme duerfen
 * deshalb ueber `items` laufen und inaktive Eintraege ueberspringen, ohne die
 * Reproduzierbarkeit zu gefaehrden.
 */
export interface Poolable {
  active: boolean;
  poolIndex: number;
}

export class Pool<T extends Poolable> {
  readonly items: T[] = [];
  private readonly free: number[] = [];

  constructor(private readonly factory: () => T) {}

  acquire(): T {
    const reusedIndex = this.free.pop();
    if (reusedIndex !== undefined) {
      const reused = this.items[reusedIndex];
      if (reused === undefined) throw new Error(`Vorrat beschaedigt bei ${reusedIndex}`);
      reused.active = true;
      return reused;
    }
    const created = this.factory();
    created.active = true;
    created.poolIndex = this.items.length;
    this.items.push(created);
    return created;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    this.free.push(item.poolIndex);
  }

  get activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i]?.active === true) count++;
    }
    return count;
  }

  clear(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item !== undefined) item.active = false;
    }
    this.free.length = 0;
    for (let i = this.items.length - 1; i >= 0; i--) this.free.push(i);
  }
}
