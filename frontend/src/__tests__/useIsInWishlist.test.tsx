import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useIsInWishlist, useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';

const product = { product_id: 'p1', id: 'p1', name: 'Tee', slug: 'tee', price: 1, images: [], status: 'active' } as any;

function Heart() {
  const on = useIsInWishlist('p1');
  return <span>{on ? 'red' : 'empty'}</span>;
}

describe('useIsInWishlist', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null }); // guest: stays local, no network
    useWishlistStore.setState({ items: [] });
  });

  it('updates the heart immediately when the item is added or removed', async () => {
    render(<Heart />);
    expect(screen.getByText('empty')).toBeInTheDocument();

    await act(() => useWishlistStore.getState().toggleItem(product));
    expect(screen.getByText('red')).toBeInTheDocument();

    await act(() => useWishlistStore.getState().toggleItem(product));
    expect(screen.getByText('empty')).toBeInTheDocument();
  });
});
