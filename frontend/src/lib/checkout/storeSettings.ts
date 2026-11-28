import type { StoreSettings } from './pricing';

// Kept separate from priceOrder.ts so the browser (cart) can load shipping settings
// without bundling server-only checkout code such as the reward-point rules.

export const DEFAULT_RETURN_DAYS = 7;
export const DEFAULT_STORE_SETTINGS: StoreSettings = { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true, return_days: DEFAULT_RETURN_DAYS };

const SHIPPING_COLS = 'free_shipping_threshold, shipping_fee, cod_enabled';
const validDays = (v: unknown) => {
  const days = Number(v);
  return Number.isInteger(days) && days > 0 ? days : DEFAULT_RETURN_DAYS;
};

/**
 * Shipping rules + return window from Admin → Settings, in one request. If the return_days column is
 * missing (migration not run yet) it retries without it, so the shipping settings are never lost.
 */
export async function loadStoreSettings(supabase: any): Promise<StoreSettings> {
  const one = (cols: string) => supabase.from('store_settings').select(cols).eq('id', 1).maybeSingle();
  let { data, error } = await one(`${SHIPPING_COLS}, return_days`);
  if (error && /return_days/.test(error.message ?? '')) ({ data, error } = await one(SHIPPING_COLS));

  if (error || !data) {
    console.warn('store_settings not available, using defaults. Run the production readiness migration.', error?.message);
    return { ...DEFAULT_STORE_SETTINGS };
  }
  return {
    free_shipping_threshold: Number(data.free_shipping_threshold),
    shipping_fee: Number(data.shipping_fee),
    cod_enabled: !!data.cod_enabled,
    return_days: validDays(data.return_days),
  };
}
