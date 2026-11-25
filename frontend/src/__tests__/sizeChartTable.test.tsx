import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SizeChartTable from '@/components/product/SizeChartTable';
import type { SizeChart } from '@/lib/sizeCharts';

const chart: SizeChart = {
  id: 'tee', name: 'Oversized T-Shirt', unit: 'in', is_default: true,
  columns: ['Chest', 'Length'],
  rows: [{ size: 'M', values: ['44', '29'] }, { size: 'L', values: ['46', '30'] }],
  note: 'Garment measurements, laid flat.',
};

describe('SizeChartTable', () => {
  it('shows every size and measurement in the chart unit', () => {
    render(<SizeChartTable chart={chart} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Size', 'Chest', 'Length']);
    expect(within(table).getByRole('row', { name: /^M 44 29$/ })).toBeInTheDocument();
    expect(screen.getByText('Garment measurements, laid flat.')).toBeInTheDocument();
  });

  it('switches between inches and cm', () => {
    render(<SizeChartTable chart={chart} />);
    fireEvent.click(screen.getByRole('button', { name: 'cm' }));
    expect(screen.getByRole('row', { name: /^M 111.8 73.7$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'in' }));
    expect(screen.getByRole('row', { name: /^M 44 29$/ })).toBeInTheDocument();
  });

  it('highlights the size the customer selected', () => {
    render(<SizeChartTable chart={chart} highlightSize="L" />);
    expect(screen.getByRole('row', { name: /^L 46 30$/ })).toHaveAttribute('aria-current', 'true');
  });
});
