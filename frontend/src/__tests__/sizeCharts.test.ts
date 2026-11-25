import { describe, expect, it } from 'vitest';
import { chartForProduct, convertMeasurement, parseSizeChartInput, SizeChartInputError, type SizeChart } from '@/lib/sizeCharts';

const valid = {
  name: ' Oversized Tee ',
  unit: 'in',
  columns: [' Chest', 'Length '],
  rows: [{ size: ' M ', values: ['44', ' 29 '] }, { size: 'L', values: ['46', '30'] }],
  note: '  Measured flat. ',
  is_default: true,
};

describe('parseSizeChartInput', () => {
  it('accepts and tidies a chart', () => {
    expect(parseSizeChartInput(valid)).toEqual({
      name: 'Oversized Tee', unit: 'in', columns: ['Chest', 'Length'],
      rows: [{ size: 'M', values: ['44', '29'] }, { size: 'L', values: ['46', '30'] }],
      note: 'Measured flat.', is_default: true,
    });
  });

  it('allows ranges like 38-40 and blank cells', () => {
    const p = parseSizeChartInput({ ...valid, rows: [{ size: 'M', values: ['38-40', ''] }] });
    expect(p.rows[0].values).toEqual(['38-40', '']);
  });

  it.each([
    [{ name: '' }, 'Give the chart a name.'],
    [{ unit: 'mm' }, 'Unit must be inches or cm.'],
    [{ columns: [] }, 'Add at least one measurement column (e.g. Chest).'],
    [{ columns: ['Chest', 'chest'] }, 'Column names must be different.'],
    [{ rows: [] }, 'Add at least one size.'],
    [{ rows: [{ size: 'M', values: ['44', '29'] }, { size: 'm', values: ['1', '2'] }] }, 'Each size can only appear once.'],
    [{ rows: [{ size: '', values: ['44', '29'] }] }, 'Every row needs a size name.'],
    [{ rows: [{ size: 'M', values: ['44'] }] }, 'Size M needs a value for every column.'],
  ])('rejects %j', (patch, message) => {
    expect(() => parseSizeChartInput({ ...valid, ...patch })).toThrow(new SizeChartInputError(message));
  });
});

describe('chartForProduct', () => {
  const charts = [
    { id: 'a', name: 'Tee', is_default: true },
    { id: 'b', name: 'Hoodie', is_default: false },
  ] as SizeChart[];

  it("uses the product's own chart, otherwise the store default", () => {
    expect(chartForProduct(charts, 'b')?.id).toBe('b');
    expect(chartForProduct(charts, null)?.id).toBe('a');
    expect(chartForProduct(charts, 'deleted-chart')?.id).toBe('a');
  });

  it('returns null when there is no chart at all', () => {
    expect(chartForProduct([], null)).toBeNull();
    expect(chartForProduct([{ ...charts[1] }], null)).toBeNull();
  });
});

describe('convertMeasurement', () => {
  it('converts inches to cm and back, including ranges', () => {
    expect(convertMeasurement('44', 'in', 'cm')).toBe('111.8');
    expect(convertMeasurement('38-40', 'in', 'cm')).toBe('96.5-101.6');
    expect(convertMeasurement('71', 'cm', 'in')).toBe('28');
    expect(convertMeasurement('72', 'cm', 'in')).toBe('28.3');
  });

  it('leaves text and same-unit values untouched', () => {
    expect(convertMeasurement('Free size', 'in', 'cm')).toBe('Free size');
    expect(convertMeasurement('44', 'in', 'in')).toBe('44');
    expect(convertMeasurement('', 'in', 'cm')).toBe('');
  });
});
