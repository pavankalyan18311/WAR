import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/reviews/[id] — Body: { status: 'approved' | 'hidden' | 'pending' } */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { status } = await request.json().catch(() => ({}));
  if (!['approved', 'hidden', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved, hidden or pending.' }, { status: 400 });
  }
  const { error } = await getServiceClient()
    .from('product_reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update the review.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/reviews/[id] */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;

  const { error } = await getServiceClient().from('product_reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete the review.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
