/** Browser-side helpers for address forms. They call our own /api/geo routes (cached + rate-limited). */

export interface LocatedAddress {
  line1: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

/** City and state for a 6-digit pincode, or null if unknown / lookup failed. */
export async function fetchPincodeInfo(pin: string): Promise<{ city: string; state: string } | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  try {
    const res = await fetch(`/api/geo/pincode?pin=${pin}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Thrown when retrying cannot help (no GPS in the browser, or permission blocked). */
export class LocationUnavailableError extends Error {}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new LocationUnavailableError('no geolocation'));
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(err.code === 1 ? new LocationUnavailableError('permission denied') : new Error('position unavailable'));
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  });
}

/** Device location → address fields. Throws if it can't (LocationUnavailableError = don't retry). */
export async function detectAddress(): Promise<LocatedAddress> {
  const { coords } = await currentPosition();
  const lat = coords.latitude.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
  const lon = coords.longitude.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
  const res = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not detect your address — please type it.');
  return data;
}
