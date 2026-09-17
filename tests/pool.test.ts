import { describe, expect, it } from 'vitest';
import { Pool } from '@shared/pool';

interface Ding {
  active: boolean;
  poolIndex: number;
  wert: number;
}

const erzeuge = (): Ding => ({ active: false, poolIndex: 0, wert: 0 });

describe('Objektvorrat', () => {
  it('vergibt fortlaufende Plaetze', () => {
    const pool = new Pool<Ding>(erzeuge);
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a.poolIndex).toBe(0);
    expect(b.poolIndex).toBe(1);
    expect(pool.activeCount).toBe(2);
  });

  it('verwendet freigegebene Plaetze wieder', () => {
    const pool = new Pool<Ding>(erzeuge);
    const a = pool.acquire();
    pool.acquire();
    pool.release(a);
    const c = pool.acquire();
    expect(c).toBe(a);
    expect(pool.items.length).toBe(2);
  });

  it('zaehlt nur aktive Eintraege', () => {
    const pool = new Pool<Ding>(erzeuge);
    const a = pool.acquire();
    pool.acquire();
    pool.release(a);
    expect(pool.activeCount).toBe(1);
  });

  it('ignoriert doppelte Freigabe', () => {
    const pool = new Pool<Ding>(erzeuge);
    const a = pool.acquire();
    pool.release(a);
    pool.release(a);
    const b = pool.acquire();
    const c = pool.acquire();
    expect(b).not.toBe(c);
  });
});
