import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductReviews from '@/components/product/ProductReviews';

let user: any = null;
vi.mock('@/store/authStore', () => ({ useAuthStore: (sel: any) => sel({ user }) }));

const publicData = {
  summary: { average: 4.5, count: 2, breakdown: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 } },
  reviews: [
    { id: 'r1', rating: 5, title: 'Perfect drape', body: 'Heavy fabric and true to size.', author: 'Asha R.', created_at: '2026-10-01', verified: true },
    { id: 'r2', rating: 4, title: null, body: 'Good tee, slightly long.', author: 'Ravi S.', created_at: '2026-10-02', verified: true },
  ],
};
let me: any;
const fetchMock = vi.fn();

beforeEach(() => {
  user = null;
  me = { canReview: false, review: null };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: any) => {
    if (init?.method === 'POST') return { ok: true, json: async () => ({ success: true, message: 'Thank you! Your review will appear once it has been checked.' }) };
    if (url.endsWith('/me')) return { ok: true, json: async () => me };
    return { ok: true, json: async () => publicData };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('ProductReviews', () => {
  it('shows the average rating and approved reviews', async () => {
    render(<ProductReviews productId="p1" productSlug="tee" />);
    expect(await screen.findByText('Perfect drape')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/2 reviews/i)).toBeInTheDocument();
    expect(screen.getAllByText(/verified buyer/i)).toHaveLength(2);
  });

  it('shows an empty state when there are no reviews', async () => {
    fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ summary: { average: 0, count: 0, breakdown: {} }, reviews: [] }) }));
    render(<ProductReviews productId="p1" productSlug="tee" />);
    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it('asks signed-out visitors to sign in to review', async () => {
    render(<ProductReviews productId="p1" productSlug="tee" />);
    expect(await screen.findByRole('link', { name: /sign in to review/i })).toHaveAttribute('href', '/auth/login?redirect=%2Fproducts%2Ftee%3Freview%3D1%23reviews');
  });

  it('lets a customer who received the product write a review', async () => {
    user = { id: 'u1' };
    me = { canReview: true, review: null };
    render(<ProductReviews productId="p1" productSlug="tee" />);

    fireEvent.click(await screen.findByRole('button', { name: /write a review/i }));
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    fireEvent.change(screen.getByLabelText(/your review/i), { target: { value: 'Lovely tee, fits well.' } });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => expect(screen.getByText(/will appear once it has been checked/i)).toBeInTheDocument());
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(post[0]).toBe('/api/products/p1/reviews');
    expect(JSON.parse(post[1].body)).toEqual({ rating: 4, title: '', body: 'Lovely tee, fits well.' });
  });

  it('tells a signed-in customer who has not received it why they cannot review', async () => {
    user = { id: 'u1' };
    render(<ProductReviews productId="p1" productSlug="tee" />);
    expect(await screen.findByText(/once your order has been delivered/i)).toBeInTheDocument();
  });

  it('shows the customer their own pending review', async () => {
    user = { id: 'u1' };
    me = { canReview: true, review: { rating: 3, title: null, body: 'Okay okay okay', status: 'pending' } };
    render(<ProductReviews productId="p1" productSlug="tee" />);
    expect(await screen.findByText(/awaiting approval/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit your review/i })).toBeInTheDocument();
  });
});
