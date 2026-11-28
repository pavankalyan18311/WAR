import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShippingSettingsCard from '@/components/admin/ShippingSettingsCard';
import { useCartStore } from '@/store/cartStore';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', fetchMock);
  useCartStore.setState({
    shippingSettings: { free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true, return_days: 7 },
    loadShippingSettings: vi.fn(async () => {}),
  } as never);
});

describe('Admin → Settings → Shipping, Payments & Returns', () => {
  it('shows the current return window and saves a new one with the shipping settings', async () => {
    render(<ShippingSettingsCard />);
    const days = screen.getByLabelText(/return \/ exchange window \(days\)/i);
    expect(days).toHaveValue(7);
    fireEvent.change(days, { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(/free delivery on orders above/i), { target: { value: '599' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/settings');
    expect(JSON.parse(init.body)).toEqual({ free_shipping_threshold: 599, shipping_fee: 99, cod_enabled: true, return_days: 9 });
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });
});
