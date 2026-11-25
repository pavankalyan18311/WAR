import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/apiAuth';
import { loadShippingPartnerSettings } from '@/lib/shipping/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AMOUNT = 50_000;

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

const isAmount = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT;
const inRange = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v > min && v <= max;

/** Shiprocket parcel defaults: [field, max allowed, message] — values must be above 0. */
const PARCEL_FIELDS: [string, number, string][] = [
  ['parcel_weight_kg', 50, 'Parcel weight must be between 0 and 50 kg.'],
  ['parcel_length_cm', 200, 'Parcel length must be between 0 and 200 cm.'],
  ['parcel_breadth_cm', 200, 'Parcel breadth must be between 0 and 200 cm.'],
  ['parcel_height_cm', 200, 'Parcel height must be between 0 and 200 cm.'],
];

/** GET /api/admin/settings — Shiprocket booking settings for Admin → Settings (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return NextResponse.json({ shiprocket: await loadShippingPartnerSettings(getAdminClient()) });
}

/**
 * PUT /api/admin/settings  (admin only)
 * Body (all optional): { free_shipping_threshold, shipping_fee, cod_enabled, auth_popup }
 */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json();
  const patch: Record<string, unknown> = {};

  for (const key of ['free_shipping_threshold', 'shipping_fee'] as const) {
    if (key in body) {
      if (!isAmount(body[key])) {
        return NextResponse.json({ error: `${key.replace(/_/g, ' ')} must be between ₹0 and ₹${MAX_AMOUNT}.` }, { status: 400 });
      }
      patch[key] = body[key];
    }
  }
  if ('cod_enabled' in body) patch.cod_enabled = !!body.cod_enabled;
  if ('shiprocket_pickup_location' in body) {
    const name = typeof body.shiprocket_pickup_location === 'string' ? body.shiprocket_pickup_location.trim() : '';
    if (!name || name.length > 60) {
      return NextResponse.json({ error: 'Enter the pickup location name exactly as it appears in Shiprocket.' }, { status: 400 });
    }
    patch.shiprocket_pickup_location = name;
  }
  for (const [key, max, message] of PARCEL_FIELDS) {
    if (key in body) {
      if (!inRange(body[key], 0, max)) return NextResponse.json({ error: message }, { status: 400 });
      patch[key] = body[key];
    }
  }
  if ('shiprocket_auto_assign' in body) patch.shiprocket_auto_assign = !!body.shiprocket_auto_assign;
  if ('auth_popup' in body) {
    if (typeof body.auth_popup !== 'object' || body.auth_popup === null) {
      return NextResponse.json({ error: 'Invalid popup settings.' }, { status: 400 });
    }
    patch.auth_popup = body.auth_popup;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await getAdminClient()
    .from('store_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('/api/admin/settings PUT error:', error);
    return NextResponse.json({ error: 'Could not save settings. Has the database migration been run?' }, { status: 500 });
  }
  return NextResponse.json({ success: true, settings: data });
}
