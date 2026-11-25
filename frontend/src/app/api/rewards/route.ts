import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { orderReference } from '@/lib/checkout/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOON_MS = 14 * 86_400_000;

function label(row: any, expired: boolean): string {
  const ref = row.order_id ? ` on order ${orderReference(row.order_id)}` : '';
  if (row.kind === 'earn') return `Earned${ref}${expired ? ' (expired)' : ''}`;
  if (row.kind === 'redeem') return `Used${ref}`;
  return `Returned${ref}`;
}

/** GET /api/rewards — the signed-in customer's points: balance, what expires soon, and history. */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { data, error } = await getServiceClient()
    .from('reward_points')
    .select('id, kind, points, remaining, expires_at, created_at, order_id')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('GET /api/rewards failed:', error);
    return NextResponse.json({ balance: 0, expiringSoon: null, history: [] });
  }

  const now = Date.now();
  const rows = data ?? [];
  const live = rows.filter((r: any) => r.kind === 'earn' && r.remaining > 0 && new Date(r.expires_at).getTime() > now);
  const balance = live.reduce((s: number, r: any) => s + Number(r.remaining), 0);

  const soon = live
    .filter((r: any) => new Date(r.expires_at).getTime() - now <= SOON_MS)
    .sort((a: any, b: any) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  const expiringSoon = soon.length
    ? { points: soon.reduce((s: number, r: any) => s + Number(r.remaining), 0), date: soon[0].expires_at }
    : null;

  const history = rows.map((r: any) => {
    const expired = r.kind === 'earn' && r.expires_at && new Date(r.expires_at).getTime() <= now;
    return { id: r.id, label: label(r, !!expired), points: Number(r.points), date: r.created_at, expires_at: r.expires_at };
  });

  return NextResponse.json({ balance, expiringSoon, history });
}
