import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { clearOtherDefaults } from '@/lib/admin/sizeChartRoutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/size-charts/default — Body: { id } makes that chart the store default; { id: null } clears it. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await request.json().catch(() => ({}));
  const supabase = getServiceClient();
  try {
    if (id) {
      const { data: chart } = await supabase.from('size_charts').select('id').eq('id', id).single();
      if (!chart) return NextResponse.json({ error: 'That size chart no longer exists.' }, { status: 404 });
    }
    await clearOtherDefaults(supabase);
    if (id) {
      const { error } = await supabase.from('size_charts').update({ is_default: true, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Set default size chart failed:', err);
    return NextResponse.json({ error: 'Could not change the default size chart.' }, { status: 500 });
  }
}
