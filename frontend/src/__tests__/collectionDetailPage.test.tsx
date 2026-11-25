import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollectionDetailPage from '@/app/collections/[slug]/page';
import { getCollections, getProducts } from '@/lib/supabase/queries';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/lib/supabase/queries', () => ({
  getCollections: vi.fn(),
  getProducts: vi.fn(),
}));
vi.mock('@/components/product/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="product-card">{product.name}</div>,
}));

vi.mock('@/components/ui/ScrollReveal', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

describe('Collection detail page', () => {
  it('shows an empty state instead of unrelated products when nothing belongs to the collection', async () => {
    vi.mocked(getCollections).mockResolvedValue([
      { id: 'c1', name: 'Summer Drop', slug: 'summer-drop', description: null, image_url: null },
    ] as any);
    vi.mocked(getProducts).mockResolvedValue([
      { product_id: 'p1', name: 'Black Basic Tee', slug: 'black-basic-tee', categories: [] },
    ] as any);

    render(await CollectionDetailPage({ params: Promise.resolve({ slug: 'summer-drop' }) }));

    expect(screen.getByText(/no products in this collection yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('product-card')).not.toBeInTheDocument();
  });

  it('shows exactly the products assigned to the collection (not name guesses)', async () => {
    vi.mocked(getCollections).mockResolvedValue([
      { id: 'c1', name: 'Oversized', slug: 'oversized', description: null, image_url: null },
    ] as any);
    vi.mocked(getProducts).mockResolvedValue([
      { product_id: 'p1', name: 'Oversized Black Tee', slug: 'oversized-black-tee', categories: [], collection_ids: [] },
      { product_id: 'p2', name: 'Classic White Tee', slug: 'classic-white-tee', categories: [], collection_ids: ['c1'] },
    ] as any);

    render(await CollectionDetailPage({ params: Promise.resolve({ slug: 'oversized' }) }));

    const cards = screen.getAllByTestId('product-card').map((c) => c.textContent);
    expect(cards).toEqual(['Classic White Tee']);
  });
});
