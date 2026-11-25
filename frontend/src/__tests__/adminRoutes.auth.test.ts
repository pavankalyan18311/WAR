import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const dbTouched = vi.fn();

vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => ({
    user: null,
    response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }),
  }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    dbTouched();
    return new Proxy({}, { get: () => () => { throw new Error('db should not be used'); } });
  },
}));

const ctx = { params: Promise.resolve({ id: 'x' }) };
const req = () => new Request('http://x', { method: 'POST', body: '{}' }) as any;

const cases: [string, () => Promise<Response>][] = [
  ['GET /api/admin/collections', async () => (await import('@/app/api/admin/collections/route')).GET()],
  ['POST /api/admin/collections', async () => (await import('@/app/api/admin/collections/route')).POST(req())],
  ['PATCH /api/admin/collections/[id]', async () => (await import('@/app/api/admin/collections/[id]/route')).PATCH(req(), ctx)],
  ['DELETE /api/admin/collections/[id]', async () => (await import('@/app/api/admin/collections/[id]/route')).DELETE(req(), ctx)],
  ['GET /api/admin/coupons', async () => (await import('@/app/api/admin/coupons/route')).GET()],
  ['POST /api/admin/coupons', async () => (await import('@/app/api/admin/coupons/route')).POST(req())],
  ['PATCH /api/admin/coupons/[id]', async () => (await import('@/app/api/admin/coupons/[id]/route')).PATCH(req(), ctx)],
  ['DELETE /api/admin/coupons/[id]', async () => (await import('@/app/api/admin/coupons/[id]/route')).DELETE(req(), ctx)],
  ['GET /api/admin/customers', async () => (await import('@/app/api/admin/customers/route')).GET()],
  ['GET /api/admin/dashboard', async () => (await import('@/app/api/admin/dashboard/route')).GET()],
];

describe('admin API routes reject non-admins', () => {
  it.each(cases)('%s returns 403 without touching the database', async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });
});
