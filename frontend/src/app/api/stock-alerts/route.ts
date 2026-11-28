import { NextResponse } from 'next/server';
import { rateLimit, RATE } from '@/lib/rateLimit';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in user's id, if any (back-in-stock requests also work for guests). */
async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await (await createClient()).auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** POST /api/stock-alerts — Body: { variant_id, email }. Asking twice is fine (one request per size + email). */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'stock-alert', RATE.form);
  if (limited) return limited;

  const { variant_id, email: raw } = await request.json().catch(() => ({}));
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (typeof variant_id !== 'string' || !variant_id) {
    return NextResponse.json({ error: 'Please choose a size.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id, status, inventory(quantity, reserved_quantity)')
    .eq('id', variant_id)
    .maybeSingle();
  if (!variant) return NextResponse.json({ error: 'This size is no longer available.' }, { status: 404 });

  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  const available = Number(inv?.quantity ?? 0) - Number(inv?.reserved_quantity ?? 0);
  if (variant.status === 'active' && available > 0) {
    return NextResponse.json({ error: 'Good news — this size is in stock. You can order it now.' }, { status: 409 });
  }

  const { error } = await supabase.from('stock_alerts').upsert(
    { variant_id, product_id: variant.product_id, email, user_id: await sessionUserId(), notified_at: null },
    { onConflict: 'variant_id,email' },
  );
  if (error) {
    console.error('POST /api/stock-alerts failed:', error);
    return NextResponse.json({ error: 'Could not save your request. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
