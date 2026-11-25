import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductDetailPage from '@/app/products/[slug]/page';
import { getProductBySlug } from '@/lib/supabase/queries';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  getProductBySlug: vi.fn(),
  getProducts: vi.fn().mockResolvedValue([]),
}));

describe('Product Detail Page - renders', () => {
  it('renders without crashing and shows not-found for an unknown slug', async () => {
    vi.mocked(getProductBySlug).mockResolvedValue(null);

    render(<ProductDetailPage params={{ slug: 'does-not-exist' }} />);

    expect(await screen.findByText(/product not found/i)).toBeInTheDocument();
  });
});
