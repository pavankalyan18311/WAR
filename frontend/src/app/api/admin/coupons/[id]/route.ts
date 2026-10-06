import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as any;
}

/** PATCH /api/admin/coupons/[id] — update a coupon */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const supabase = getAdminClient();

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowed = [
      'code', 'description', 'coupon_type', 'discount_type', 'discount_value',
      'min_order_amount', 'max_discount_amount', 'max_uses', 'max_uses_per_user',
      'first_order_only', 'inactive_days_threshold', 'is_active', 'valid_from', 'valid_to',
    ];
    for (const key of allowed) {
      if (key in body) updatePayload[key] = body[key];
    }
    if (updatePayload.code) {
      updatePayload.code = String(updatePayload.code).toUpperCase().trim();
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ coupon: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons/[id] — delete a coupon */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('coupons').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
