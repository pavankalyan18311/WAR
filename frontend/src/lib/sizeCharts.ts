export type SizeUnit = 'in' | 'cm';

export interface SizeChartRow {
  size: string;
  values: string[];
}

export interface SizeChartInput {
  name: string;
  unit: SizeUnit;
  columns: string[];
  rows: SizeChartRow[];
  note: string | null;
  is_default: boolean;
}

export interface SizeChart extends SizeChartInput {
  id: string;
}

/** A problem the admin can fix — returned as a 400 with this message. */
export class SizeChartInputError extends Error {}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parseSizeChartInput(body: any): SizeChartInput {
  const fail = (msg: string): never => { throw new SizeChartInputError(msg); };

  const name = clean(body?.name);
  if (!name) fail('Give the chart a name.');
  if (name.length > 60) fail('Keep the chart name under 60 characters.');

  const unit = body?.unit;
  if (unit !== 'in' && unit !== 'cm') fail('Unit must be inches or cm.');

  const columns = (Array.isArray(body?.columns) ? body.columns : []).map(clean);
  if (columns.length === 0) fail('Add at least one measurement column (e.g. Chest).');
  if (columns.length > 8) fail('Use at most 8 measurement columns.');
  if (columns.some((c: string) => !c || c.length > 30)) fail('Every column needs a short name (up to 30 characters).');
  if (new Set(columns.map((c: string) => c.toLowerCase())).size !== columns.length) fail('Column names must be different.');

  const rawRows = Array.isArray(body?.rows) ? body.rows : [];
  if (rawRows.length === 0) fail('Add at least one size.');
  if (rawRows.length > 20) fail('Use at most 20 sizes.');
  const seen = new Set<string>();
  const rows: SizeChartRow[] = rawRows.map((r: any) => {
    const size = clean(r?.size);
    if (!size) fail('Every row needs a size name.');
    if (seen.has(size.toLowerCase())) fail('Each size can only appear once.');
    seen.add(size.toLowerCase());
    const values = (Array.isArray(r?.values) ? r.values : []).map(clean);
    if (values.length !== columns.length) fail(`Size ${size} needs a value for every column.`);
    if (values.some((v: string) => v.length > 20)) fail(`Keep the values for size ${size} short (up to 20 characters).`);
    return { size, values };
  });

  const note = clean(body?.note);
  if (note.length > 500) fail('Keep the note under 500 characters.');

  return { name, unit, columns, rows, note: note || null, is_default: body?.is_default === true };
}

/** The chart to show for a product: its own chart, otherwise the store default, otherwise none. */
export function chartForProduct(charts: SizeChart[], sizeChartId: string | null | undefined): SizeChart | null {
  return charts.find((c) => c.id === sizeChartId) ?? charts.find((c) => c.is_default) ?? null;
}

const CM_PER_IN = 2.54;

/** "44" in → "111.8" cm; ranges ("38-40") are converted on both ends; text is left as it is. */
export function convertMeasurement(value: string, from: SizeUnit, to: SizeUnit): string {
  if (from === to || !value) return value;
  return value.replace(/\d+(?:\.\d+)?/g, (n) => {
    const converted = to === 'cm' ? Number(n) * CM_PER_IN : Number(n) / CM_PER_IN;
    return String(Math.round(converted * 10) / 10);
  });
}
