import { NextResponse } from 'next/server';
import { parseSizeChartInput, SizeChartInputError } from '@/lib/sizeCharts';

/** Validates the body; returns the input or a 400 response. */
export async function readSizeChart(request: Request) {
  try {
    return { input: parseSizeChartInput(await request.json().catch(() => ({}))), response: null };
  } catch (err) {
    if (err instanceof SizeChartInputError) return { input: null, response: NextResponse.json({ error: err.message }, { status: 400 }) };
    throw err;
  }
}

/** Only one chart can be the default: clear the flag on every other chart first. */
export async function clearOtherDefaults(supabase: any, keepId?: string) {
  let query = supabase.from('size_charts').update({ is_default: false }).eq('is_default', true);
  if (keepId) query = query.neq('id', keepId);
  const { error } = await query;
  if (error) throw error;
}

export function sizeChartSaveError(err: any) {
  console.error('Size chart save failed:', err);
  const duplicate = err?.code === '23505';
  return NextResponse.json(
    { error: duplicate ? 'A chart with this name already exists.' : 'Could not save the size chart. Have you run the latest database migration?' },
    { status: duplicate ? 400 : 500 },
  );
}
