import { NextResponse } from 'next/server';
import { rateLimit, RATE } from '@/lib/rateLimit';
import { requireUser } from '@/lib/apiAuth';
import { reverseGeocode } from '@/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Could not detect your address right now — please type your address.';

/** GET /api/geo/reverse?lat=..&lon=.. → { line1, area, city, state, pincode }. Signed-in customers only. */
export async function GET(request: Request) {
  const limited = rateLimit(request, 'lookup', RATE.lookup);
  if (limited) return limited;

  const auth = await requireUser();
  if (auth.response) return auth.response;

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  // India's bounding box (roughly) — we only deliver in India.
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 6 || lat > 37.5 || lon < 68 || lon > 97.5) {
    return NextResponse.json({ error: 'We could only detect a location outside India. Please type your address.' }, { status: 400 });
  }

  const result = await reverseGeocode(lat, lon);
  if (!result || result === 'busy') return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  return NextResponse.json(result);
}
