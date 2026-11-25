import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/size-charts — every size chart (public; shown on product pages and /size-guide). */
export async function GET() {
  const { data, error } = await getServiceClient()
    .from('size_charts')
    .select('id, name, unit, columns, rows, note, is_default')
    .order('name');
  if (error) {
    console.error('GET size charts failed:', error);
    return NextResponse.json({ charts: [] });
  }
  return NextResponse.json({ charts: data ?? [] });
}
