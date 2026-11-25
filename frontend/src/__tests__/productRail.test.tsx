import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProductRail from '@/components/product/ProductRail';

vi.mock('@/components/product/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="product-card">{product.name}</div>,
}));

const products = [1, 2, 3, 4, 5, 6].map((n) => ({ product_id: `p${n}`, name: `Tee ${n}`, slug: `tee-${n}` })) as any[];

describe('ProductRail', () => {
  beforeEach(() => {
    // jsdom has no layout/scrolling — stub what the rail uses.
    Element.prototype.scrollBy = vi.fn();
  });

  it('renders a titled, horizontally scrollable list of product cards', () => {
    render(<ProductRail eyebrow="Your history" title="Recently viewed" products={products} />);
    expect(screen.getByRole('heading', { name: 'Recently viewed' })).toBeInTheDocument();
    expect(screen.getByText('Your history')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Recently viewed' });
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(list.className).toMatch(/snap-x/);
    expect(screen.getAllByTestId('product-card').map((c) => c.textContent)).toEqual(products.map((p) => p.name));
  });

  it('arrow buttons scroll the rail by about one screen', () => {
    render(<ProductRail title="You may also like" products={products} />);
    const list = screen.getByRole('list', { name: 'You may also like' });
    Object.defineProperty(list, 'clientWidth', { value: 1000, configurable: true });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(list.scrollBy).toHaveBeenLastCalledWith({ left: 900, behavior: 'smooth' });
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(list.scrollBy).toHaveBeenLastCalledWith({ left: -900, behavior: 'smooth' });
  });

  it('can cap how many products it shows', () => {
    render(<ProductRail title="Recently viewed" products={products} limit={4} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('renders nothing when there are no products', () => {
    const { container } = render(<ProductRail title="Recently viewed" products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
