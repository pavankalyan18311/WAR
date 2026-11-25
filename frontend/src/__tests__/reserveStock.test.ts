import { describe, expect, it, vi } from 'vitest';
import { reserveStock, releaseStock } from '@/lib/checkout/fulfil';

const lines = [
  { variant_id: 'v1', quantity: 2 },
  { variant_id: 'v2', quantity: 1 },
];

function fakeSupabase(outOfStock: string[] = []) {
  const rpc = vi.fn(async (fn: string, args: any) => ({
    data: fn === 'decrement_inventory' ? !outOfStock.includes(args.p_variant_id) : null,
    error: null,
  }));
  return { rpc };
}

describe('reserveStock', () => {
  it('decrements every line and returns true', async () => {
    const sb = fakeSupabase();
    expect(await reserveStock(sb, lines)).toBe(true);
    expect(sb.rpc.mock.calls).toEqual([
      ['decrement_inventory', { p_variant_id: 'v1', p_qty: 2 }],
      ['decrement_inventory', { p_variant_id: 'v2', p_qty: 1 }],
    ]);
  });

  it('puts back what it took when a later line is out of stock', async () => {
    const sb = fakeSupabase(['v2']);
    expect(await reserveStock(sb, lines)).toBe(false);
    expect(sb.rpc.mock.calls.at(-1)).toEqual(['increment_inventory', { p_variant_id: 'v1', p_qty: 2 }]);
  });
});

describe('releaseStock', () => {
  it('increments every line', async () => {
    const sb = fakeSupabase();
    await releaseStock(sb, lines);
    expect(sb.rpc.mock.calls.map((c) => c[0])).toEqual(['increment_inventory', 'increment_inventory']);
  });
});
