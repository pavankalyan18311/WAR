'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import type { Product } from '@/types';

/**
 * Recently viewed products, saved in this browser — checked against the live shop first,
 * so deleted or unpublished products disappear from the list.
 */
export function useRecentlyViewed(): Product[] {
  const items = useRecentlyViewedStore((s) => s.items);
  const prune = useRecentlyViewedStore((s) => s.prune);
  const key = items.map((p) => p.product_id).join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;
    let live = true;
    Promise.resolve(createClient().from('products').select('id').eq('status', 'active').in('id', ids))
      .then(({ data, error }) => {
        if (live && !error && data) prune(data.map((row: { id: string }) => row.id));
      })
      .catch(() => { /* offline: keep the list as it is */ });
    return () => { live = false; };
  }, [key, prune]);

  return items;
}
