import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * GET /api/addresses?user_id=...
 * Returns all saved delivery addresses for a given user sorted by default status and recency.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    // Primary attempt: order by is_default and created_at
    let { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    // Fallback attempt if ordering column is missing
    if (error) {
      console.warn('/api/addresses GET warning (retrying simple select):', error.message);
      const fallback = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('/api/addresses GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, addresses: data || [] });
  } catch (err: any) {
    console.error('/api/addresses GET exception:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/addresses
 * Creates a new delivery address for a user. Supports multiple addresses per user.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, full_name, phone, address_line_1, address_line_2, city, state, pincode, country, is_default } = body;

    if (!user_id || !full_name || !phone || !address_line_1 || !city || !pincode) {
      return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // If setting as default, clear existing default flags for this user first
    if (is_default) {
      await (supabase as any)
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user_id);
    }

    const insertObj: any = {
      user_id,
      full_name: full_name.trim(),
      phone: phone.trim(),
      address_line_1: address_line_1.trim(),
      address_line_2: address_line_2 ? address_line_2.trim() : null,
      city: city.trim(),
      state: (state || '').trim(),
      pincode: pincode.trim(),
      country: country ? country.trim() : 'India',
      is_default: !!is_default,
    };

    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      insertObj.id = crypto.randomUUID();
    }

    let { data, error } = await (supabase as any)
      .from('addresses')
      .insert(insertObj)
      .select()
      .single();

    // Fallback if .single() / .select() fails
    if (error) {
      console.warn('/api/addresses POST warning (retrying simple insert):', error.message);
      const fallback = await (supabase as any)
        .from('addresses')
        .insert(insertObj);
      if (!fallback.error) {
        data = { ...insertObj };
        error = null;
      }
    }

    if (error) {
      console.error('/api/addresses POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, address: data || insertObj });
  } catch (err: any) {
    console.error('/api/addresses POST exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to save address' }, { status: 500 });
  }
}

/**
 * DELETE /api/addresses?id=...&user_id=...
 * Deletes a saved address by ID.
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('user_id');

  if (!id) {
    return NextResponse.json({ error: 'Address id is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();
    let query = supabase.from('addresses').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;

    if (error) {
      console.error('/api/addresses DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('/api/addresses DELETE exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete address' }, { status: 500 });
  }
}

