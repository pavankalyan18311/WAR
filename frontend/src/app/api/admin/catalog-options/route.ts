import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { slugify } from '@/lib/admin/products';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/catalog-options — add a category, colour or size (admin only).
 * Body: { kind: 'category' | 'color' | 'size', name, hex? }
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { kind, name: rawName, hex } = await request.json();
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const rows: Record<string, [string, Record<string, unknown>]> = {
    category: ['categories', { name, slug: slugify(name) }],
    color: ['colors', { name, color_code: typeof hex === 'string' && /^#[0-9a-f]{6}$/i.test(hex) ? hex : null }],
    size: ['size_options', { name: name.toUpperCase() }],
  };
  const target = rows[kind];
  if (!target) return NextResponse.json({ error: 'Unknown option type.' }, { status: 400 });

  const [table, row] = target;
  const { data, error } = await getServiceClient().from(table).insert(row).select().single();
  if (error) {
    const duplicate = String(error.code) === '23505';
    return NextResponse.json(
      { error: duplicate ? `"${name}" already exists.` : 'Could not save. Please try again.' },
      { status: duplicate ? 409 : 500 },
    );
  }
  return NextResponse.json({ success: true, option: data });
}
