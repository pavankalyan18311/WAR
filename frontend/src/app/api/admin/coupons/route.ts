import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { CouponInputError, parseCouponInput } from '@/lib/admin/coupons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/coupons — all coupons, newest first (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await getServiceClient().from('coupons').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('/api/admin/coupons GET error:', error);
    return NextResponse.json({ error: 'Could not load coupons.' }, { status: 500 });
  }
  return NextResponse.json({ coupons: data ?? [] });
}

/** POST /api/admin/coupons — create a coupon (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const coupon = parseCouponInput(await request.json());
    const { data, error } = await getServiceClient().from('coupons').insert(coupon).select().single();
    if (error) {
      if (String(error.code) === '23505') {
        return NextResponse.json({ error: `A coupon with the code ${coupon.code} already exists.` }, { status: 409 });
      }
      console.error('/api/admin/coupons POST error:', error);
      return NextResponse.json({ error: 'Could not save the coupon. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err) {
    if (err instanceof CouponInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
