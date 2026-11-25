import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SizeGuideDrawer from '@/components/product/SizeGuideDrawer';

const charts = [
  { id: 'tee', name: 'Oversized T-Shirt', unit: 'in', is_default: true, columns: ['Chest'], rows: [{ size: 'M', values: ['44'] }], note: null },
  { id: 'hood', name: 'Hoodie', unit: 'in', is_default: false, columns: ['Chest'], rows: [{ size: 'M', values: ['48'] }], note: null },
];
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('SizeGuideDrawer', () => {
  it("opens this product's own chart", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ charts }) });
    render(<SizeGuideDrawer sizeChartId="hood" selectedSize="M" />);
    fireEvent.click(await screen.findByRole('button', { name: /size guide/i }));
    const dialog = screen.getByRole('dialog', { name: /size guide/i });
    expect(dialog).toHaveTextContent('Hoodie');
    expect(dialog).toHaveTextContent('48');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the store default chart', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ charts }) });
    render(<SizeGuideDrawer sizeChartId={null} />);
    fireEvent.click(await screen.findByRole('button', { name: /size guide/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Oversized T-Shirt');
  });

  it('shows no link when there is no chart', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ charts: [] }) });
    const { container } = render(<SizeGuideDrawer sizeChartId={null} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
