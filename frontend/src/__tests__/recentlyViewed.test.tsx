/* eslint-disable @typescript-eslint/no-explicit-any -- chainable fake Supabase query builder */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import type { Product } from '@/types';

let liveIds: string[] = [];
const inCalls: string[][] = [];
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => {
      let ids: string[] = [];
      const b: any = {
        select: () => b,
        eq: () => b,
        in: (_c: string, v: string[]) => { ids = v; inCalls.push(v); return b; },
        then: (resolve: any) => resolve({ data: ids.filter((id) => liveIds.includes(id)).map((id) => ({ id })), error: null }),
      };
      return b;
    },
  }),
}));

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

const p = (id: string) => ({ product_id: id, id, name: id, slug: id } as unknown as Product);

beforeEach(() => {
  inCalls.length = 0;
  useRecentlyViewedStore.setState({ items: [p('asura'), p('old-test-tee'), p('redline')] });
});

describe('recently viewed', () => {
  it('prune keeps only products that are still in the shop, in the same order', () => {
    useRecentlyViewedStore.getState().prune(['redline', 'asura']);
    expect(useRecentlyViewedStore.getState().items.map((x) => x.product_id)).toEqual(['asura', 'redline']);
  });

  it('checks the saved products against the live shop and drops deleted ones', async () => {
    liveIds = ['asura', 'redline'];
    const { result } = renderHook(() => useRecentlyViewed());
    await waitFor(() => expect(result.current.map((x) => x.product_id)).toEqual(['asura', 'redline']));
    expect(inCalls[0]).toEqual(['asura', 'old-test-tee', 'redline']);
  });

  it('does not ask the shop when nothing has been viewed', async () => {
    useRecentlyViewedStore.setState({ items: [] });
    renderHook(() => useRecentlyViewed());
    await new Promise((r) => setTimeout(r, 0));
    expect(inCalls).toHaveLength(0);
  });
});
