import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { RackHeroError, parseRackTeeInput } from '@/lib/rackHero';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/rack — every rack tee (hidden ones too) in rail order (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { data, error } = await getServiceClient().from('home_rack_tees').select('*').order('sort_order').order('created_at');
  if (error) return NextResponse.json({ error: 'Could not load rack tees. Have you run the latest database migration?' }, { status: 500 });
  return NextResponse.json({ tees: data ?? [] });
}

/** POST /api/admin/rack — Body: { name, price, front_url, back_url?, link_url? }; added at the end of the rail. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let input;
  try {
    input = parseRackTeeInput(await request.json().catch(() => ({})));
  } catch (err) {
    if (err instanceof RackHeroError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('home_rack_tees').select('sort_order');
  const next = Math.max(0, ...(existing ?? []).map((r: { sort_order: number | null }) => Number(r.sort_order) || 0)) + 1;
  const { data, error } = await supabase
    .from('home_rack_tees')
    .insert({ ...input, sort_order: next, is_active: true, is_featured: false })
    .select('*')
    .single();
  if (error) {
    console.error('POST /api/admin/rack failed:', error);
    return NextResponse.json({ error: 'Could not add the tee.' }, { status: 500 });
  }
  return NextResponse.json({ tee: data });
}
