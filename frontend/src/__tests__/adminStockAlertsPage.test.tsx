import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminStockAlertsPage from '@/app/admin/stock-alerts/page';

const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });

describe('Admin → Back in stock', () => {
  it('lists the most-wanted sold-out sizes with how many customers are waiting', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ groups: [
      { variant_id: 'v1', product: 'Oversized Tee', slug: 'oversized-tee', size: 'M', color: 'Black', count: 5, latest: '2026-10-10T10:00:00Z' },
      { variant_id: 'v2', product: 'Graphic Tee', slug: 'graphic-tee', size: 'L', color: null, count: 1, latest: '2026-10-09T10:00:00Z' },
    ] }) });
    render(<AdminStockAlertsPage />);
    const row = (await screen.findByText('Oversized Tee')).closest('tr')!;
    expect(row).toHaveTextContent('M · Black');
    expect(row).toHaveTextContent('5');
    expect(screen.getByText(/6 customers waiting/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Oversized Tee' })).toHaveAttribute('href', '/products/oversized-tee');
  });

  it('shows an empty state', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ groups: [] }) });
    render(<AdminStockAlertsPage />);
    expect(await screen.findByText(/no one is waiting/i)).toBeInTheDocument();
  });

  it('shows the server error', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Have you run the latest database migration?' }) });
    render(<AdminStockAlertsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('migration');
  });
});
