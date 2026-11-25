import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { clearOtherDefaults, readSizeChart, sizeChartSaveError } from '@/lib/admin/sizeChartRoutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/admin/size-charts/[id] — replace a chart's contents. */
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const { input, response } = await readSizeChart(request);
  if (response) return response;

  try {
    const supabase = getServiceClient();
    if (input.is_default) await clearOtherDefaults(supabase, id);
    const { error } = await supabase.from('size_charts').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return sizeChartSaveError(err);
  }
}

/** DELETE /api/admin/size-charts/[id] — products using it fall back to the default chart. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { error } = await getServiceClient().from('size_charts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete the size chart.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
