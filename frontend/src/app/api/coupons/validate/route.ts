import { NextResponse } from 'next/server';
import { rateLimit, RATE } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { checkCoupon } from '@/lib/checkout/coupons';
import { couponDiscount } from '@/lib/checkout/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/coupons/validate
 * Body: { code: string; subtotal: number }
 * Preview only — checkout re-validates the coupon on the server with real prices.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'coupon', RATE.lookup);
  if (limited) return limited;

  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { code, subtotal } = await request.json();
    if (!code || typeof subtotal !== 'number') {
      return NextResponse.json({ valid: false, error: 'Missing required fields' }, { status: 400 });
    }

    const check = await checkCoupon(getAdminClient(), code, subtotal, auth.user.id);
    if (!check.coupon) return NextResponse.json({ valid: false, error: check.error });

    const { coupon } = check;
    return NextResponse.json({
      valid: true,
      discount: couponDiscount(coupon, subtotal),
      free_shipping: coupon.discount_type === 'free_shipping',
      coupon: {
        id: coupon.id,
        code: coupon.code.toUpperCase(),
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_amount: coupon.max_discount_amount,
      },
    });
  } catch (err) {
    console.error('Coupon validate error:', err);
    return NextResponse.json({ valid: false, error: 'Failed to validate coupon.' }, { status: 500 });
  }
}
