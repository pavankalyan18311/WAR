import type { StoreSettings } from './pricing';

// Kept separate from priceOrder.ts so the browser (cart) can load shipping settings
// without bundling server-only checkout code such as the reward-point rules.

export const DEFAULT_STORE_SETTINGS: StoreSettings = { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true };

export async function loadStoreSettings(supabase: any): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('free_shipping_threshold, shipping_fee, cod_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    console.warn('store_settings not available, using defaults. Run the production readiness migration.', error?.message);
    return DEFAULT_STORE_SETTINGS;
  }
  return {
    free_shipping_threshold: Number(data.free_shipping_threshold),
    shipping_fee: Number(data.shipping_fee),
    cod_enabled: !!data.cod_enabled,
  };
}
