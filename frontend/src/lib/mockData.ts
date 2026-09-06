import type { Product, Category } from '@/types';

export const CATEGORIES: Category[] = [];

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  banner?: string;
  thumbnail?: string;
  productCount?: number;
  tag?: string;
  categoryIds?: string[];
}

export const COLLECTIONS: Collection[] = [];

export function getCollectionBySlug(_slug: string): Collection | undefined {
  return undefined;
}

export function getProductsForCollection(_collection: Collection): Product[] {
  return [];
}

export const MOCK_PRODUCTS: Product[] = [];
