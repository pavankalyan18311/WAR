// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const load = async () => {
  vi.resetModules();
  return import('@/lib/geo');
};
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('lookupPincode (India Post)', () => {
  beforeEach(() => fetchMock.mockReset());

  it('returns city (district) and state', async () => {
    fetchMock.mockResolvedValue(ok([{ Status: 'Success', PostOffice: [{ Name: 'MG Road', District: 'Bangalore', State: 'Karnataka' }] }]));
    const { lookupPincode } = await load();
    expect(await lookupPincode('560001')).toEqual({ city: 'Bangalore', state: 'Karnataka' });
  });

  it('caches results so a pincode is fetched once', async () => {
    fetchMock.mockResolvedValue(ok([{ Status: 'Success', PostOffice: [{ District: 'Pune', State: 'Maharashtra' }] }]));
    const { lookupPincode } = await load();
    await lookupPincode('411001');
    await lookupPincode('411001');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for an unknown pincode, bad input or a failing service', async () => {
    const { lookupPincode } = await load();
    expect(await lookupPincode('12')).toBeNull();
    fetchMock.mockResolvedValueOnce(ok([{ Status: 'Error', PostOffice: null }]));
    expect(await lookupPincode('999999')).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    expect(await lookupPincode('110001')).toBeNull();
  });
});

describe('reverseGeocode (OpenStreetMap)', () => {
  beforeEach(() => fetchMock.mockReset());

  const nominatim = {
    address: { house_number: '12', road: '100 Feet Road', suburb: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', postcode: '560038' },
  };

  it('turns coordinates into address fields', async () => {
    fetchMock.mockResolvedValue(ok(nominatim));
    const { reverseGeocode } = await load();
    expect(await reverseGeocode(12.97194, 77.64115)).toEqual({
      line1: '12, 100 Feet Road', area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('nominatim.openstreetmap.org/reverse');
    expect(init.headers['User-Agent']).toMatch(/WAR/); // required by the OpenStreetMap usage policy
  });

  it('caches nearby lookups (same ~10 m spot) so repeat taps cost nothing', async () => {
    fetchMock.mockResolvedValue(ok(nominatim));
    const { reverseGeocode } = await load();
    await reverseGeocode(12.971941, 77.641121); // both round to 12.9719, 77.6411
    await reverseGeocode(12.971939, 77.641139);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends at most one request per second to OpenStreetMap', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(ok(nominatim));
    const { reverseGeocode } = await load();
    const a = reverseGeocode(10, 10);
    const b = reverseGeocode(20, 20);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1100);
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('returns "busy" instead of queueing forever when many people tap at once', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(ok(nominatim));
    const { reverseGeocode } = await load();
    const calls = Array.from({ length: 6 }, (_, i) => reverseGeocode(i, i));
    await vi.advanceTimersByTimeAsync(10_000);
    const results = await Promise.all(calls);
    expect(results.filter((r) => r === 'busy').length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
    vi.useRealTimers();
  });

  it('returns null when the service fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const { reverseGeocode } = await load();
    expect(await reverseGeocode(1, 1)).toBeNull();
  });
});
