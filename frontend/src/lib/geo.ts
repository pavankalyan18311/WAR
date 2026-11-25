/**
 * Address helpers for checkout and the account page. Server-only (called from /api/geo/*).
 * Both services are free; results are cached in memory and failures return null,
 * so the customer can always just type the address.
 */

export interface PincodeInfo {
  city: string;
  state: string;
}

export interface LocatedAddress {
  line1: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

const TIMEOUT_MS = 5000;
const CACHE_LIMIT = 5000;

function remember<V>(cache: Map<string, V>, key: string, value: V) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

// ─── Pincode → city/state (India Post) ───────────────────────────────────────
const pincodeCache = new Map<string, PincodeInfo | null>();

export async function lookupPincode(pin: string): Promise<PincodeInfo | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  if (pincodeCache.has(pin)) return pincodeCache.get(pin)!;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    const po = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null;
    const info = po ? { city: po.District || po.Division || po.Name || '', state: po.State || '' } : null;
    remember(pincodeCache, pin, info); // pincodes don't change — unknown ones are cached too
    return info;
  } catch {
    return null; // not cached: the service may just be slow right now
  }
}

// ─── Coordinates → address (OpenStreetMap Nominatim) ─────────────────────────
// Usage policy: max 1 request/second, identify the app, cache results.
// https://operations.osmfoundation.org/policies/nominatim/
const MIN_GAP_MS = 1100;
const MAX_WAIT_MS = 3000;
const geoCache = new Map<string, LocatedAddress>();
let nextSlot = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function reverseGeocode(lat: number, lon: number): Promise<LocatedAddress | null | 'busy'> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`; // ~11 m
  const cached = geoCache.get(key);
  if (cached) return cached;

  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  if (wait > MAX_WAIT_MS) return 'busy';
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
  if (wait) await sleep(wait);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': `WAR-Without-Any-Regrets/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || 'online store'})`,
        'Accept-Language': 'en-IN,en',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const a = (await res.json())?.address;
    if (!a) return null;
    const located: LocatedAddress = {
      line1: [a.house_number, a.road].filter(Boolean).join(', '),
      area: a.suburb || a.neighbourhood || a.quarter || a.village || '',
      city: a.city || a.town || a.city_district || a.county || a.state_district || '',
      state: a.state || '',
      pincode: String(a.postcode || '').replace(/\D/g, '').slice(0, 6),
    };
    remember(geoCache, key, located);
    return located;
  } catch {
    return null;
  }
}
