import type { ProductVariant } from '@/types';

export function isVariantAvailable(variant: Pick<ProductVariant, 'status' | 'stock_quantity'>): boolean {
  return variant.status === 'active' && variant.stock_quantity > 0;
}
