// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiAuth', () => ({ requireAdmin: async () => ({ user: { id: 'admin' }, response: null }) }));

const writes: { op: string; row: any }[] = [];
let dbError: any = null;
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        insert: (row: any) => { writes.push({ op: 'insert', row }); return b; },
        update: (row: any) => { writes.push({ op: 'update', row }); return b; },
        eq: () => b, select: () => b,
        single: async () => ({ data: { id: 'c1', ...writes.at(-1)?.row }, error: dbError }),
      };
      return b;
    },
  }),
}));

const valid = { code: 'war10', coupon_type: 'general', discount_type: 'percentage', discount_value: '10', max_uses_per_user: '' };
const req = (method: string, body: any) => new Request('http://x', { method, body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: 'c1' }) };

beforeEach(() => { writes.length = 0; dbError = null; });

describe('admin coupon routes', () => {
  it('POST saves a validated coupon (blank uses-per-customer = unlimited, not 0)', async () => {
    const { POST } = await import('@/app/api/admin/coupons/route');
    const res = await POST(req('POST', valid));
    expect(res.status).toBe(201);
    expect(writes[0].row).toMatchObject({ code: 'WAR10', discount_value: 10, max_uses_per_user: null });
  });

  it('POST returns the form problem as a clear 400', async () => {
    const { POST } = await import('@/app/api/admin/coupons/route');
    const res = await POST(req('POST', { ...valid, discount_value: '150' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Enter a discount between 1% and 100%.');
    expect(writes).toHaveLength(0);
  });

  it('POST explains a duplicate code', async () => {
    dbError = { code: '23505', message: 'duplicate' };
    const { POST } = await import('@/app/api/admin/coupons/route');
    const res = await POST(req('POST', valid));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/);
  });

  it('PATCH with only is_active just switches the coupon on/off', async () => {
    const { PATCH } = await import('@/app/api/admin/coupons/[id]/route');
    expect((await PATCH(req('PATCH', { is_active: false }), ctx)).status).toBe(200);
    expect(writes[0].row).toEqual({ is_active: false, updated_at: expect.any(String) });
  });

  it('PATCH with full details validates them like create', async () => {
    const { PATCH } = await import('@/app/api/admin/coupons/[id]/route');
    expect((await PATCH(req('PATCH', { ...valid, valid_from: '2026-11-10', valid_to: '2026-11-01' }), ctx)).status).toBe(400);
    expect((await PATCH(req('PATCH', valid), ctx)).status).toBe(200);
    expect(writes[0].row).toMatchObject({ code: 'WAR10', max_uses_per_user: null });
  });
});
