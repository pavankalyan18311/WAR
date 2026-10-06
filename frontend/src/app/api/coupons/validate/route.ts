import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function calcDiscount(coupon: any, subtotal: number): number {
  if (coupon.discount_type === 'free_shipping') return 0;
  if (coupon.discount_type === 'flat') return Math.min(coupon.discount_value, subtotal);
  const raw = Math.round((subtotal * coupon.discount_value) / 100);
  return coupon.max_discount_amount ? Math.min(raw, coupon.max_discount_amount) : raw;
}

/**
 * POST /api/coupons/validate
 * Body: { code: string; subtotal: number; user_id?: string }
 */
export async function POST(request: Request) {
  try {
    const { code, subtotal, user_id } = await request.json();

    if (!code || typeof subtotal !== 'number') {
      return NextResponse.json({ valid: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const today = new Date().toISOString().split('T')[0];

    // 1. Find coupon (case-insensitive)
    const { data: coupon, error: couponErr } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .single();

    if (couponErr || !coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code.' });
    }

    // 2. Active check
    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active.' });
    }

    // 3. Date validity
    if (coupon.valid_from && coupon.valid_from > today) {
      return NextResponse.json({ valid: false, error: 'This coupon is not valid yet.' });
    }
    if (coupon.valid_to && coupon.valid_to < today) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired.' });
    }

    // 4. Minimum order amount
    if (subtotal < coupon.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₹${coupon.min_order_amount} required for this coupon.`,
      });
    }

    // 5. Global usage limit
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit.' });
    }

    // 6. User-specific checks
    if (user_id) {
      // Per-user usage limit
      if (coupon.max_uses_per_user !== null) {
        const { count } = await supabase
          .from('coupon_usages')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', user_id);

        if ((count ?? 0) >= coupon.max_uses_per_user) {
          return NextResponse.json({ valid: false, error: 'You have already used this coupon.' });
        }
      }

      // First order only / welcome type
      if (coupon.first_order_only || coupon.coupon_type === 'welcome') {
        const { count: orderCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .in('status', ['confirmed', 'shipped', 'delivered']);

        if ((orderCount ?? 0) > 0) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is only valid for your first order.',
          });
        }
      }

      // Welcome back — must not have ordered in X days, but must have at least 1 prior order
      if (coupon.coupon_type === 'welcome_back' && coupon.inactive_days_threshold) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - coupon.inactive_days_threshold);

        const { count: recentCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .gte('created_at', thresholdDate.toISOString())
          .in('status', ['confirmed', 'shipped', 'delivered']);

        if ((recentCount ?? 0) > 0) {
          return NextResponse.json({
            valid: false,
            error: `This coupon is for customers who haven't ordered in ${coupon.inactive_days_threshold} days.`,
          });
        }

        const { count: totalCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .in('status', ['confirmed', 'shipped', 'delivered']);

        if ((totalCount ?? 0) === 0) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is for returning customers only.',
          });
        }
      }
    }

    const discountAmount = calcDiscount(coupon, subtotal);

    return NextResponse.json({
      valid: true,
      discount: discountAmount,
      free_shipping: coupon.discount_type === 'free_shipping',
      coupon: {
        id: coupon.id,
        code: (coupon.code as string).toUpperCase(),
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_amount: coupon.max_discount_amount,
      },
    });
  } catch (err: any) {
    console.error('Coupon validate error:', err);
    return NextResponse.json({ valid: false, error: 'Failed to validate coupon.' }, { status: 500 });
  }
}
