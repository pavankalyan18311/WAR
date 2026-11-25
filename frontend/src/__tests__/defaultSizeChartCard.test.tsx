import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DefaultSizeChartCard from '@/components/admin/DefaultSizeChartCard';

const charts = [
  { id: 'tee', name: 'Oversized T-Shirt', is_default: true },
  { id: 'hood', name: 'Hoodie', is_default: false },
];
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_u: string, init?: any) =>
    init?.method ? { ok: true, json: async () => ({ success: true }) } : { ok: true, json: async () => ({ charts }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Settings → Default size chart', () => {
  it('shows the current default and saves a new one', async () => {
    render(<DefaultSizeChartCard />);
    const select = await screen.findByRole('combobox', { name: /default size chart/i });
    await waitFor(() => expect(select).toHaveValue('tee'));

    fireEvent.change(select, { target: { value: 'hood' } });
    fireEvent.click(screen.getByRole('button', { name: /save default/i }));

    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(url).toBe('/api/admin/size-charts/default');
    expect(JSON.parse(init.body)).toEqual({ id: 'hood' });
  });

  it('can turn the default off', async () => {
    render(<DefaultSizeChartCard />);
    const select = await screen.findByRole('combobox', { name: /default size chart/i });
    await waitFor(() => expect(select).toHaveValue('tee'));
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save default/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST' && JSON.parse(i.body).id === null)).toBe(true));
  });
});
