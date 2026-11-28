/* eslint-disable @typescript-eslint/no-explicit-any -- loosely typed test doubles / admin client */
import { describe, expect, it } from 'vitest';
import { DEFAULT_RETURN_DAYS, loadStoreSettings } from '@/lib/checkout/storeSettings';

/** Fake client: one store_settings row; asking for return_days fails when the column doesn't exist yet. */
function client(row: Record<string, unknown> | null, opts: { noReturnDaysColumn?: boolean } = {}) {
  const selects: string[] = [];
  return {
    selects,
    from: () => {
      let cols = '';
      const b: any = {
        select: (c: string) => { cols = c; selects.push(c); return b; },
        eq: () => b,
        maybeSingle: async () => (opts.noReturnDaysColumn && cols.includes('return_days')
          ? { data: null, error: { message: 'column store_settings.return_days does not exist' } }
          : { data: row && Object.fromEntries(cols.split(',').map((c) => c.trim()).map((c) => [c, row[c]])), error: null }),
      };
      return b;
    },
  };
}

describe('loadStoreSettings', () => {
  const row = { free_shipping_threshold: 1500, shipping_fee: 79, cod_enabled: true, return_days: 9 };

  it('reads shipping rules and the return window set in Admin → Settings — in ONE request', async () => {
    const db = client(row);
    const s = await loadStoreSettings(db);
    expect(s).toEqual({ free_shipping_threshold: 1500, shipping_fee: 79, cod_enabled: true, return_days: 9 });
    expect(db.selects).toHaveLength(1);
  });

  it('falls back to 7 days before the migration — without losing the shipping settings', async () => {
    expect(DEFAULT_RETURN_DAYS).toBe(7);
    const s = await loadStoreSettings(client(row, { noReturnDaysColumn: true }));
    expect(s).toEqual({ free_shipping_threshold: 1500, shipping_fee: 79, cod_enabled: true, return_days: 7 });
  });

  it('uses the defaults when there is no settings row', async () => {
    const s = await loadStoreSettings(client(null));
    expect(s).toEqual({ free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true, return_days: 7 });
  });
});
