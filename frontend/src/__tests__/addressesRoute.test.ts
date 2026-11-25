import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedInUser: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedInUser
      ? { user: signedInUser, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

// Records every filter / payload so tests can assert which user's rows were touched.
const calls: { op: string; payload?: any; eq: [string, string][] }[] = [];
function builder(op: string, payload?: any) {
  const entry = { op, payload, eq: [] as [string, string][] };
  calls.push(entry);
  const b: any = {
    eq: (c: string, v: string) => { entry.eq.push([c, v]); return b; },
    order: () => b,
    select: () => b,
    single: async () => ({ data: { id: 'a1', ...payload }, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return b;
}
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => builder('select'),
      insert: (p: any) => builder('insert', p),
      update: (p: any) => builder('update', p),
      delete: () => builder('delete'),
    }),
  }),
}));

const route = () => import('@/app/api/addresses/route');
const json = (method: string, body: any) =>
  new Request('http://x/api/addresses', { method, body: JSON.stringify(body) });

const address = {
  full_name: 'Asha Rao', phone: '9876501234', address_line_1: '12 MG Road',
  city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
};

describe('/api/addresses', () => {
  beforeEach(() => { calls.length = 0; signedInUser = { id: 'me' }; });

  it('rejects anonymous requests with 401', async () => {
    signedInUser = null;
    const { GET } = await route();
    const res = await GET();
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('GET only returns the signed-in user\'s addresses, ignoring user_id in the URL', async () => {
    const { GET } = await route();
    await GET();
    expect(calls[0].eq).toEqual([['user_id', 'me']]);
  });

  it('POST saves the address for the signed-in user, ignoring user_id in the body', async () => {
    const { POST } = await route();
    const res = await POST(json('POST', { ...address, user_id: 'victim' }));
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.op === 'insert')?.payload.user_id).toBe('me');
  });

  it('PATCH updates the existing row (no duplicate) and only if it belongs to the user', async () => {
    const { PATCH } = await route();
    const res = await PATCH(json('PATCH', { id: 'a1', ...address, is_default: true }));
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
    const update = calls.filter((c) => c.op === 'update').pop()!;
    expect(update.eq).toEqual([['id', 'a1'], ['user_id', 'me']]);
    expect(update.payload).toMatchObject({ full_name: 'Asha Rao', is_default: true });
  });

  it('DELETE is scoped to the signed-in user', async () => {
    const { DELETE } = await route();
    await DELETE(new Request('http://x/api/addresses?id=a1&user_id=victim', { method: 'DELETE' }));
    expect(calls[0]).toMatchObject({ op: 'delete', eq: [['id', 'a1'], ['user_id', 'me']] });
  });
});
