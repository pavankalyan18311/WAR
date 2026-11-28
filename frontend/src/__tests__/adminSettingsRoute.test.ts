import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin
      ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const updates: any[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        update: (p: any) => { updates.push(p); return b; },
        eq: () => b,
        select: () => b,
        single: async () => ({ data: { id: 1, ...updates.at(-1) }, error: null }),
        maybeSingle: async () => ({ data: { shiprocket_pickup_location: 'Hyderabad Hub', parcel_weight_kg: 0.3, parcel_length_cm: 30, parcel_breadth_cm: 25, parcel_height_cm: 3, shiprocket_auto_assign: true }, error: null }),
      };
      return b;
    },
  }),
}));

const put = (body: any) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) });
const route = () => import('@/app/api/admin/settings/route');

describe('PUT /api/admin/settings', () => {
  beforeEach(() => { updates.length = 0; isAdmin = true; });

  it('is admin-only', async () => {
    isAdmin = false;
    expect((await (await route()).PUT(put({ shipping_fee: 0 }))).status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it('saves the free-shipping threshold, fee and COD switch', async () => {
    const res = await (await route()).PUT(put({ free_shipping_threshold: 1499, shipping_fee: 79, cod_enabled: false }));
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ free_shipping_threshold: 1499, shipping_fee: 79, cod_enabled: false });
  });

  it.each([
    [{ free_shipping_threshold: -1 }],
    [{ shipping_fee: 'abc' }],
    [{ shipping_fee: 100000 }],
  ])('rejects invalid values %o', async (body) => {
    expect((await (await route()).PUT(put(body))).status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it('saves the return / exchange window in days', async () => {
    const res = await (await route()).PUT(put({ return_days: 9 }));
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ return_days: 9 });
  });

  it.each([[0], [61], [2.5], ['7']])('rejects a return window of %o days', async (days) => {
    const res = await (await route()).PUT(put({ return_days: days }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Return window must be a whole number of days between 1 and 60.');
    expect(updates).toHaveLength(0);
  });

  it('saves the Shiprocket pickup location, parcel size/weight and auto-assign switch', async () => {
    const res = await (await route()).PUT(put({
      shiprocket_pickup_location: '  Hyderabad Hub ', parcel_weight_kg: 0.35, parcel_length_cm: 32, parcel_breadth_cm: 26, parcel_height_cm: 4, shiprocket_auto_assign: false,
    }));
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({
      shiprocket_pickup_location: 'Hyderabad Hub', parcel_weight_kg: 0.35, parcel_length_cm: 32, parcel_breadth_cm: 26, parcel_height_cm: 4, shiprocket_auto_assign: false,
    });
  });

  it.each([
    [{ shiprocket_pickup_location: '' }],
    [{ parcel_weight_kg: 0 }],
    [{ parcel_weight_kg: 80 }],
    [{ parcel_length_cm: -5 }],
  ])('rejects invalid Shiprocket values %o', async (body) => {
    expect((await (await route()).PUT(put(body))).status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it('GET returns the Shiprocket settings (admin only)', async () => {
    const { GET } = await route();
    expect(await (await GET()).json()).toMatchObject({ shiprocket: { pickup_location: 'Hyderabad Hub', weight_kg: 0.3, auto_assign: true } });
    isAdmin = false;
    expect((await GET()).status).toBe(403);
  });

  it('saves the login popup content for all shoppers', async () => {
    const popup = { enabled: true, delayMs: 8000, mediaType: 'image', mediaUrl: '', headline: 'Join WAR', description: 'd', ctaText: 'c', sessionBehavior: 'always' };
    await (await route()).PUT(put({ auth_popup: popup }));
    expect(updates[0].auth_popup).toEqual(popup);
  });
});
