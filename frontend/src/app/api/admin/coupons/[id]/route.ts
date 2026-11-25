import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { CouponInputError, parseCouponInput } from '@/lib/admin/coupons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/coupons/[id] — update a coupon (admin only).
 * Body { is_active } alone switches it on/off; otherwise the full form is validated like create.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const onlyToggle = Object.keys(body).length === 1 && typeof body.is_active === 'boolean';

  try {
    const patch = onlyToggle ? { is_active: body.is_active } : parseCouponInput(body);
    const { data, error } = await getServiceClient()
      .from('coupons')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (String(error.code) === '23505') {
        return NextResponse.json({ error: 'Another coupon already uses this code.' }, { status: 409 });
      }
      console.error('/api/admin/coupons PATCH error:', error);
      return NextResponse.json({ error: 'Could not update the coupon.' }, { status: 500 });
    }
    return NextResponse.json({ coupon: data });
  } catch (err) {
    if (err instanceof CouponInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

/** DELETE /api/admin/coupons/[id] — delete a coupon (admin only). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const { error } = await getServiceClient().from('coupons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete the coupon.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
