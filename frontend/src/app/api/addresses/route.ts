import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/** Picks and trims the editable address fields from a request body. */
function addressFields(body: any) {
  return {
    full_name: String(body.full_name ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    address_line_1: String(body.address_line_1 ?? '').trim(),
    address_line_2: body.address_line_2 ? String(body.address_line_2).trim() : null,
    city: String(body.city ?? '').trim(),
    state: String(body.state ?? '').trim(),
    pincode: String(body.pincode ?? '').trim(),
    country: body.country ? String(body.country).trim() : 'India',
    is_default: !!body.is_default,
  };
}

const missingRequired = (a: ReturnType<typeof addressFields>) =>
  !a.full_name || !a.phone || !a.address_line_1 || !a.city || !a.pincode;

async function clearOtherDefaults(supabase: any, userId: string) {
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
}

/** GET /api/addresses — the signed-in user's saved addresses, default first. */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { data, error } = await getAdminClient()
    .from('addresses')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('/api/addresses GET error:', error);
    return NextResponse.json({ error: 'Could not load addresses.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, addresses: data ?? [] });
}

/** POST /api/addresses — adds a new address for the signed-in user. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const fields = addressFields(await request.json());
  if (missingRequired(fields)) {
    return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (fields.is_default) await clearOtherDefaults(supabase, auth.user.id);

  const { data, error } = await supabase
    .from('addresses')
    .insert({ ...fields, user_id: auth.user.id })
    .select()
    .single();

  if (error) {
    console.error('/api/addresses POST error:', error);
    return NextResponse.json({ error: 'Failed to save address.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, address: data });
}

/** PATCH /api/addresses — updates one of the signed-in user's addresses (body must include id). */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Address id is required' }, { status: 400 });

  const fields = addressFields(body);
  if (missingRequired(fields)) {
    return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
  }

  const supabase = getAdminClient();
  if (fields.is_default) await clearOtherDefaults(supabase, auth.user.id);

  const { data, error } = await supabase
    .from('addresses')
    .update(fields)
    .eq('id', body.id)
    .eq('user_id', auth.user.id)
    .select()
    .single();

  if (error || !data) {
    console.error('/api/addresses PATCH error:', error);
    return NextResponse.json({ error: 'Address not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, address: data });
}

/** DELETE /api/addresses?id=... — deletes one of the signed-in user's addresses. */
export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Address id is required' }, { status: 400 });

  const { error } = await getAdminClient()
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('/api/addresses DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete address.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
