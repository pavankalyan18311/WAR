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

/** GET /api/admin/collections — list all collections */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ collections: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/admin/collections — create a new collection */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description, image_url, is_active } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from('collections')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    const { data, error } = await supabase
      .from('collections')
      .insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description || null,
        image_url: image_url || null,
        display_order: nextOrder,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A collection with this slug already exists.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ collection: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
