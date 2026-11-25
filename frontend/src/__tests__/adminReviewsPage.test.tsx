import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminReviewsPage from '@/app/admin/reviews/page';

const review = {
  id: 'r1', rating: 4, title: 'Nice fit', body: 'Soft and heavy fabric.', status: 'pending', created_at: '2026-10-09',
  product: { name: 'Oversized Tee', slug: 'oversized-tee' }, profile: { name: 'Ravi Kumar', email: 'ravi@x.com' },
};
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: any) =>
    init?.method ? { ok: true, json: async () => ({ success: true }) } : { ok: true, json: async () => ({ reviews: [review] }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Admin → Reviews', () => {
  it('lists reviews waiting for approval with product and customer', async () => {
    render(<AdminReviewsPage />);
    expect(await screen.findByText('Nice fit')).toBeInTheDocument();
    expect(screen.getByText('Oversized Tee')).toBeInTheDocument();
    expect(screen.getByText(/ravi@x\.com/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviews?status=pending');
  });

  it('approves a review and removes it from the pending list', async () => {
    render(<AdminReviewsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.queryByText('Nice fit')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviews/r1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }));
  });

  it('hides a review', async () => {
    render(<AdminReviewsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^hide$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviews/r1', expect.objectContaining({ body: JSON.stringify({ status: 'hidden' }) })));
  });
});
