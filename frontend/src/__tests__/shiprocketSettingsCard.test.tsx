import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShiprocketSettingsCard from '@/components/admin/ShiprocketSettingsCard';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_u: string, init?: any) => init?.method === 'PUT'
    ? { ok: true, json: async () => ({ success: true }) }
    : { ok: true, json: async () => ({ shiprocket: { pickup_location: 'Primary', weight_kg: 0.3, length_cm: 30, breadth_cm: 25, height_cm: 3, auto_assign: true } }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Admin → Settings → Shiprocket', () => {
  it('loads the current settings and saves changes', async () => {
    render(<ShiprocketSettingsCard />);
    const pickup = await screen.findByLabelText(/pickup location name/i);
    await waitFor(() => expect(pickup).toHaveValue('Primary'));

    fireEvent.change(pickup, { target: { value: 'Hyderabad Hub' } });
    fireEvent.change(screen.getByLabelText(/weight per item/i), { target: { value: '0.35' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /assign courier automatically/i }));
    fireEvent.click(screen.getByRole('button', { name: /save shiprocket settings/i }));

    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')!;
    expect(JSON.parse(put[1].body)).toEqual({
      shiprocket_pickup_location: 'Hyderabad Hub', parcel_weight_kg: 0.35,
      parcel_length_cm: 30, parcel_breadth_cm: 25, parcel_height_cm: 3, shiprocket_auto_assign: false,
    });
  });

  it('shows the server error', async () => {
    render(<ShiprocketSettingsCard />);
    await screen.findByDisplayValue('Primary');
    fetchMock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({ error: 'Parcel weight must be between 0 and 50 kg.' }) }));
    fireEvent.click(screen.getByRole('button', { name: /save shiprocket settings/i }));
    expect(await screen.findByText('Parcel weight must be between 0 and 50 kg.')).toBeInTheDocument();
  });
});
