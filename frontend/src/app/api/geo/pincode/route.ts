import { NextResponse } from 'next/server';
import { lookupPincode } from '@/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/geo/pincode?pin=560001 → { city, state } */
export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get('pin') ?? '';
  if (!/^[1-9]\d{5}$/.test(pin)) return NextResponse.json({ error: 'Enter a valid 6-digit pincode.' }, { status: 400 });

  const info = await lookupPincode(pin);
  if (!info) return NextResponse.json({ error: 'Pincode not found.' }, { status: 404 });
  return NextResponse.json(info, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
