// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn = true;
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => (signedIn ? { user: { id: 'u1' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) }),
}));
const lookupPincode = vi.fn();
const reverseGeocode = vi.fn();
vi.mock('@/lib/geo', () => ({
  lookupPincode: (p: string) => lookupPincode(p),
  reverseGeocode: (a: number, b: number) => reverseGeocode(a, b),
}));

const pin = async (q: string) => (await import('@/app/api/geo/pincode/route')).GET(new Request(`http://x/api/geo/pincode?${q}`));
const rev = async (q: string) => (await import('@/app/api/geo/reverse/route')).GET(new Request(`http://x/api/geo/reverse?${q}`));

describe('GET /api/geo/pincode', () => {
  beforeEach(() => { lookupPincode.mockReset(); });

  it('returns city and state', async () => {
    lookupPincode.mockResolvedValue({ city: 'Pune', state: 'Maharashtra' });
    const res = await pin('pin=411001');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ city: 'Pune', state: 'Maharashtra' });
  });

  it('400 for a malformed pincode; 404 when unknown', async () => {
    expect((await pin('pin=12ab')).status).toBe(400);
    lookupPincode.mockResolvedValue(null);
    expect((await pin('pin=999999')).status).toBe(404);
  });
});

describe('GET /api/geo/reverse', () => {
  beforeEach(() => { signedIn = true; reverseGeocode.mockReset(); });

  it('requires sign-in (protects the free OpenStreetMap allowance)', async () => {
    signedIn = false;
    expect((await rev('lat=12.9&lon=77.6')).status).toBe(401);
  });

  it('returns the address for valid coordinates', async () => {
    reverseGeocode.mockResolvedValue({ line1: '', area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' });
    const res = await rev('lat=12.97&lon=77.64');
    expect(res.status).toBe(200);
    expect((await res.json()).pincode).toBe('560038');
  });

  it('400 for invalid or out-of-India coordinates', async () => {
    expect((await rev('lat=abc&lon=77')).status).toBe(400);
    expect((await rev('lat=51.5&lon=-0.12')).status).toBe(400); // London
  });

  it('503 with a friendly message when busy or unavailable', async () => {
    reverseGeocode.mockResolvedValue('busy');
    const busy = await rev('lat=12.97&lon=77.64');
    expect(busy.status).toBe(503);
    expect((await busy.json()).error).toMatch(/type your address/i);
    reverseGeocode.mockResolvedValue(null);
    expect((await rev('lat=12.97&lon=77.64')).status).toBe(503);
  });
});
