import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { clearOtherDefaults, readSizeChart, sizeChartSaveError } from '@/lib/admin/sizeChartRoutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/size-charts — all charts with how many products use each. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  const [{ data: charts, error }, { data: products }] = await Promise.all([
    supabase.from('size_charts').select('*').order('name'),
    supabase.from('products').select('size_chart_id'),
  ]);
  if (error) return NextResponse.json({ error: 'Could not load size charts. Have you run the latest database migration?' }, { status: 500 });

  const usage = new Map<string, number>();
  for (const p of products ?? []) if (p.size_chart_id) usage.set(p.size_chart_id, (usage.get(p.size_chart_id) ?? 0) + 1);
  return NextResponse.json({ charts: (charts ?? []).map((c: any) => ({ ...c, product_count: usage.get(c.id) ?? 0 })) });
}

/** POST /api/admin/size-charts — create a chart. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { input, response } = await readSizeChart(request);
  if (response) return response;

  try {
    const supabase = getServiceClient();
    if (input.is_default) await clearOtherDefaults(supabase);
    const { data, error } = await supabase.from('size_charts').insert(input).select('*').single();
    if (error) throw error;
    return NextResponse.json({ chart: data });
  } catch (err) {
    return sizeChartSaveError(err);
  }
}
