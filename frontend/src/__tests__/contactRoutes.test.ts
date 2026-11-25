// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

const addToMarketingList = vi.fn(async () => true);
vi.mock('@/lib/email/marketing', () => ({ addToMarketingList: (e: string) => (addToMarketingList as any)(e) }));

const writes: { table: string; op: string; row: any }[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const b: any = {
        insert: (row: any) => { writes.push({ table, op: 'insert', row }); return Promise.resolve({ error: null }); },
        upsert: (row: any) => { writes.push({ table, op: 'upsert', row }); return Promise.resolve({ error: null }); },
        update: (row: any) => { writes.push({ table, op: 'update', row }); return b; },
        select: () => b, order: () => b, eq: () => b,
        then: (r: any) => r({ data: [{ id: 'm1', name: 'Asha', status: 'new' }], error: null }),
      };
      return b;
    },
  }),
}));

const post = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const valid = { name: 'Asha', email: 'asha@example.com', message: 'Where is my order?', order_ref: 'WAR-ABCDEF12' };

beforeEach(() => { writes.length = 0; isAdmin = true; });

describe('POST /api/contact', () => {
  it('saves a valid message', async () => {
    const { POST } = await import('@/app/api/contact/route');
    expect((await POST(post(valid))).status).toBe(200);
    expect(writes[0]).toMatchObject({ table: 'contact_messages', op: 'insert', row: { name: 'Asha', email: 'asha@example.com', order_ref: 'WAR-ABCDEF12', user_id: null } });
  });

  it.each([
    [{ ...valid, name: '' }],
    [{ ...valid, email: 'not-an-email' }],
    [{ ...valid, message: 'hi' }],
    [{ ...valid, message: 'x'.repeat(5001) }],
  ])('rejects invalid input %#', async (body) => {
    const { POST } = await import('@/app/api/contact/route');
    expect((await POST(post(body))).status).toBe(400);
    expect(writes).toHaveLength(0);
  });

  it('validates the message itself, not the topic, and stores the topic with it', async () => {
    const { POST } = await import('@/app/api/contact/route');
    expect((await POST(post({ ...valid, subject: 'other', message: 'short' }))).status).toBe(400);
    expect(writes).toHaveLength(0);
    await POST(post({ ...valid, subject: 'order' }));
    expect(writes[0].row.message).toBe('[order] Where is my order?');
  });

  it('silently drops bot submissions that fill the hidden field', async () => {
    const { POST } = await import('@/app/api/contact/route');
    expect((await POST(post({ ...valid, website: 'spam.example' }))).status).toBe(200);
    expect(writes).toHaveLength(0);
  });
});

describe('POST /api/newsletter', () => {
  it('subscribes a valid email (idempotent)', async () => {
    const { POST } = await import('@/app/api/newsletter/route');
    expect((await POST(post({ email: ' Asha@Example.com ' }))).status).toBe(200);
    expect(writes[0]).toMatchObject({ table: 'newsletter_subscribers', op: 'upsert', row: { email: 'asha@example.com' } });
    expect(addToMarketingList).toHaveBeenCalledWith('asha@example.com');
  });

  it('rejects an invalid email', async () => {
    const { POST } = await import('@/app/api/newsletter/route');
    expect((await POST(post({ email: 'nope' }))).status).toBe(400);
  });
});

describe('admin messages', () => {
  it('GET is admin-only', async () => {
    isAdmin = false;
    const { GET } = await import('@/app/api/admin/messages/route');
    expect((await GET()).status).toBe(403);
  });

  it('GET lists messages', async () => {
    const { GET } = await import('@/app/api/admin/messages/route');
    expect((await (await GET()).json()).messages[0].id).toBe('m1');
  });

  it('PATCH marks a message handled', async () => {
    const { PATCH } = await import('@/app/api/admin/messages/route');
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ id: 'm1', status: 'handled' }) }));
    expect(res.status).toBe(200);
    expect(writes[0]).toMatchObject({ table: 'contact_messages', op: 'update', row: { status: 'handled' } });
  });
});
