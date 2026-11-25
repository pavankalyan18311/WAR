import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { supabasePricingDeps } from '@/lib/checkout/priceOrder';
import { quoteCart } from '@/lib/checkout/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/**
 * POST /api/orders/quote — Body: { items: [{ variant_id, quantity }], coupon_code? }
 * The server's current view of a cart: prices, stock left, unavailable items and whether the
 * coupon still applies. Read-only; works for guests (customer-specific coupon rules need sign-in).
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  const userId = auth.user?.id ?? null;
  const body = await request.json().catch(() => ({}));

  try {
    const quote = await quoteCart(supabasePricingDeps(getAdminClient(), userId), {
      items: body?.items ?? [],
      couponCode: typeof body?.coupon_code === 'string' ? body.coupon_code : null,
    });
    return NextResponse.json(quote);
  } catch (err) {
    console.error('/api/orders/quote failed:', err);
    return NextResponse.json({ error: 'Could not check your cart right now.' }, { status: 500 });
  }
}
