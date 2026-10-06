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

/** GET /api/admin/coupons — list all coupons with usage stats */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ coupons: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/admin/coupons — create a new coupon */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      code,
      description,
      coupon_type,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      max_uses,
      max_uses_per_user,
      first_order_only,
      inactive_days_threshold,
      is_active,
      valid_from,
      valid_to,
    } = body;

    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'code, discount_type, and discount_value are required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase().trim(),
        description: description || null,
        coupon_type: coupon_type || 'general',
        discount_type,
        discount_value: Number(discount_value),
        min_order_amount: Number(min_order_amount) || 0,
        max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
        max_uses: max_uses ? Number(max_uses) : null,
        max_uses_per_user: max_uses_per_user !== undefined ? Number(max_uses_per_user) : 1,
        first_order_only: Boolean(first_order_only),
        inactive_days_threshold: inactive_days_threshold ? Number(inactive_days_threshold) : null,
        is_active: is_active !== false,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
