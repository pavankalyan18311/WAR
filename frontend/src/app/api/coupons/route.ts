import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { checkCouponBasics, checkCouponForCustomer } from '@/lib/checkout/coupons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function customerTitle(c: any): string {
  if (c.discount_type === 'free_shipping') return 'FREE SHIPPING';
  if (c.discount_type === 'flat') return `₹${c.discount_value} OFF`;
  return `${c.discount_value}% OFF${c.max_discount_amount ? ` (up to ₹${c.max_discount_amount})` : ''}`;
}

/**
 * GET /api/coupons — coupons the signed-in customer can use right now (for their account page).
 * Uses the same rules as checkout, so a coupon they already used up is not shown.
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  const { data, error } = await supabase.from('coupons').select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (error) {
    console.error('GET /api/coupons error:', error);
    return NextResponse.json({ coupons: [] });
  }

  const today = new Date().toISOString().slice(0, 10);
  const usable = [];
  for (const c of data ?? []) {
    // Minimum order is shown as a note, not used to hide the coupon.
    if (checkCouponBasics(c, Number.MAX_SAFE_INTEGER, today)) continue;
    if (await checkCouponForCustomer(supabase, c, auth.user.id)) continue;
    usable.push({
      code: String(c.code).toUpperCase(),
      title: customerTitle(c),
      desc: c.min_order_amount > 0 ? `On orders of ₹${c.min_order_amount} or more.` : '',
      expires: c.valid_to ? `Valid till ${fmtDate(c.valid_to)}` : 'No expiry',
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_amount: Number(c.min_order_amount ?? 0),
      coupon_type: c.coupon_type,
    });
  }
  return NextResponse.json({ coupons: usable });
}
