import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminSizeChartsPage from '@/app/admin/size-charts/page';

const tee = {
  id: 'tee', name: 'Oversized T-Shirt', unit: 'in', is_default: true, product_count: 4, note: null,
  columns: ['Chest', 'Length'], rows: [{ size: 'M', values: ['44', '29'] }],
};
const fetchMock = vi.fn();
const calls = (method: string) => fetchMock.mock.calls.filter(([, init]) => init?.method === method);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: any) =>
    init?.method ? { ok: true, json: async () => ({ success: true }) } : { ok: true, json: async () => ({ charts: [tee] }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Admin → Size Charts', () => {
  it('lists charts with their default status and how many products use them', async () => {
    render(<AdminSizeChartsPage />);
    const card = (await screen.findByText('Oversized T-Shirt')).closest('article')!;
    expect(card).toHaveTextContent(/default/i);
    expect(card).toHaveTextContent(/4 products/i);
  });

  it('edits a value and adds a size, then saves the whole chart', async () => {
    render(<AdminSizeChartsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit oversized t-shirt/i }));

    fireEvent.change(screen.getByLabelText('Chest for M'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /add size/i }));
    fireEvent.change(screen.getByLabelText('Size name 2'), { target: { value: 'L' } });
    fireEvent.change(screen.getByLabelText('Chest for L'), { target: { value: '47' } });
    fireEvent.change(screen.getByLabelText('Length for L'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /save chart/i }));

    await waitFor(() => expect(calls('PUT')).toHaveLength(1));
    const [url, init] = calls('PUT')[0];
    expect(url).toBe('/api/admin/size-charts/tee');
    expect(JSON.parse(init.body)).toMatchObject({
      name: 'Oversized T-Shirt', unit: 'in', is_default: true, columns: ['Chest', 'Length'],
      rows: [{ size: 'M', values: ['45', '29'] }, { size: 'L', values: ['47', '30'] }],
    });
  });

  it('adds a measurement column', async () => {
    render(<AdminSizeChartsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit oversized t-shirt/i }));
    fireEvent.click(screen.getByRole('button', { name: /add column/i }));
    fireEvent.change(screen.getByLabelText('Column name 3'), { target: { value: 'Sleeve' } });
    fireEvent.change(screen.getByLabelText('Sleeve for M'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /save chart/i }));
    await waitFor(() => expect(calls('PUT')).toHaveLength(1));
    expect(JSON.parse(calls('PUT')[0][1].body).rows[0].values).toEqual(['44', '29', '9']);
  });

  it('creates a new chart', async () => {
    render(<AdminSizeChartsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /new size chart/i }));
    const editor = screen.getByRole('form', { name: /size chart editor/i });
    fireEvent.change(within(editor).getByLabelText('Chart name'), { target: { value: 'Hoodie' } });
    fireEvent.change(within(editor).getByLabelText('Size name 1'), { target: { value: 'M' } });
    fireEvent.click(within(editor).getByRole('button', { name: /save chart/i }));
    await waitFor(() => expect(calls('POST')).toHaveLength(1));
    expect(calls('POST')[0][0]).toBe('/api/admin/size-charts');
    expect(JSON.parse(calls('POST')[0][1].body)).toMatchObject({ name: 'Hoodie', rows: [{ size: 'M' }] });
  });

  it('shows the server error (e.g. validation) and keeps the editor open', async () => {
    fetchMock.mockImplementation(async (_u: string, init?: any) =>
      init?.method ? { ok: false, json: async () => ({ error: 'Each size can only appear once.' }) } : { ok: true, json: async () => ({ charts: [tee] }) });
    render(<AdminSizeChartsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit oversized t-shirt/i }));
    fireEvent.click(screen.getByRole('button', { name: /save chart/i }));
    expect(await screen.findByText('Each size can only appear once.')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /size chart editor/i })).toBeInTheDocument();
  });

  it('deletes a chart after confirming', async () => {
    render(<AdminSizeChartsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete oversized t-shirt/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(calls('DELETE')[0][0]).toBe('/api/admin/size-charts/tee'));
  });
});
