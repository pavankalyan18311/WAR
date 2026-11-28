// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));

type Row = Record<string, any>;
let settings: Row;
let reels: Row[];
const signed: any[] = [];
const removed: string[][] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => ({
        createSignedUploadUrl: async (path: string) => { signed.push({ bucket, path }); return { data: { signedUrl: `https://s/${path}?token=t`, token: 't', path }, error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
        remove: async (paths: string[]) => { removed.push(paths); return { error: null }; },
      }),
    },
    from: (table: string) => {
      const filters: [string, any][] = [];
      let op: 'select' | 'update' | 'delete' | 'insert' = 'select';
      let payload: Row = {};
      const rows = () => (table === 'store_settings' ? [settings] : reels).filter((r) => filters.every(([k, v]) => r[k] === v));
      const b: any = {
        select: () => b, order: () => b, limit: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        insert: (p: Row) => { op = 'insert'; payload = { id: `r${reels.length + 1}`, ...p }; reels.push(payload); return b; },
        update: (p: Row) => { op = 'update'; payload = p; return b; },
        delete: () => { op = 'delete'; return b; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        single: async () => ({ data: op === 'insert' ? payload : rows()[0], error: null }),
        then: (resolve: any) => {
          const matched = rows();
          if (op === 'update') matched.forEach((r) => Object.assign(r, payload));
          if (op === 'delete') reels = reels.filter((r) => !matched.includes(r));
          return resolve({ data: matched, error: null });
        },
      };
      return b;
    },
  }),
}));

const req = (method: string, body?: unknown) => new Request('http://x', { method, body: body ? JSON.stringify(body) : undefined });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const home = () => import('@/app/api/admin/home/route');
const reelsRoute = () => import('@/app/api/admin/reels/route');
const reelOne = () => import('@/app/api/admin/reels/[id]/route');
const upload = () => import('@/app/api/admin/uploads/media/route');

beforeEach(() => {
  isAdmin = true;
  settings = { id: 1, home_marquee: null, instagram_url: null };
  reels = [];
  signed.length = 0;
  removed.length = 0;
});

describe('admin homepage routes', () => {
  it('everything is admin-only', async () => {
    isAdmin = false;
    expect((await (await home()).GET()).status).toBe(403);
    expect((await (await home()).PUT(req('PUT', {}))).status).toBe(403);
    expect((await (await reelsRoute()).POST(req('POST', {}))).status).toBe(403);
    expect((await (await upload()).POST(req('POST', {}))).status).toBe(403);
  });

  it('saves the scrolling banner and Instagram link; GET returns defaults before anything is saved', async () => {
    const before = await (await (await home()).GET()).json();
    expect(before.marquee.items).toContain('Without Any Regrets');
    const res = await (await home()).PUT(req('PUT', {
      marquee: { enabled: true, items: ['Drop 02 is live'], background: '#f36e21', text_color: '#ffffff', accent_color: '#161412' },
      instagram_url: '@war.wear',
    }));
    expect(res.status).toBe(200);
    expect(settings).toMatchObject({
      home_marquee: { items: ['Drop 02 is live'], background: '#F36E21', text_color: '#FFFFFF' },
      instagram_url: 'https://www.instagram.com/war.wear/',
    });
  });

  it('saves the announcement bar; GET returns the defaults before anything is saved', async () => {
    const before = await (await (await home()).GET()).json();
    expect(before.announcements.items[2]).toBe('Cash on delivery available');
    const res = await (await home()).PUT(req('PUT', { announcements: { enabled: true, items: ['Drop 02 is live ', 'COD available'] } }));
    expect(res.status).toBe(200);
    expect(settings.home_announcements).toEqual({ enabled: true, items: ['Drop 02 is live', 'COD available'] });
  });

  it('rejects an empty announcement bar', async () => {
    const res = await (await home()).PUT(req('PUT', { announcements: { items: [] } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Add at least one announcement.');
  });

  it('serves the announcement bar publicly (defaults, then what the admin saved)', async () => {
    const pub = () => import('@/app/api/announcements/route');
    expect((await (await (await pub()).GET()).json()).items).toHaveLength(3);
    settings.home_announcements = { enabled: false, items: ['Drop 02 is live'] };
    expect(await (await (await pub()).GET()).json()).toEqual({ enabled: false, items: ['Drop 02 is live'] });
  });

  it('rejects a bad banner with a clear message', async () => {
    const res = await (await home()).PUT(req('PUT', { marquee: { items: [], background: '#000000', text_color: '#ffffff', accent_color: '#ffffff' } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Add at least one banner text.');
  });

  it('gives a one-time upload link for a reel video (videos go straight to storage)', async () => {
    const res = await (await upload()).POST(req('POST', { content_type: 'video/mp4', size: 12_000_000 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(signed[0]).toMatchObject({ bucket: 'media' });
    expect(signed[0].path).toMatch(/^reels\/[0-9a-f-]+\.mp4$/);
    expect(body).toMatchObject({ token: 't', path: signed[0].path });
    expect(body.publicUrl).toContain('/media/reels/');
  });

  it('refuses unsupported or too-large files', async () => {
    expect((await (await upload()).POST(req('POST', { content_type: 'application/pdf', size: 10 }))).status).toBe(400);
    expect((await (await upload()).POST(req('POST', { content_type: 'video/mp4', size: 60_000_000 }))).status).toBe(400);
  });

  it('adds reels at the end, hides/shows and deletes them (also removing the stored video)', async () => {
    const add = (n: number) => reelsRoute().then((m) => m.POST(req('POST', {
      video_url: `https://abc.supabase.co/storage/v1/object/public/media/reels/${n}.mp4`, link_url: 'https://www.instagram.com/reel/x/', caption: `Reel ${n}`,
    })));
    expect((await add(1)).status).toBe(200);
    await add(2);
    expect(reels.map((r) => r.sort_order)).toEqual([1, 2]);

    await (await reelOne()).PATCH(req('PATCH', { is_active: false }), ctx('r1'));
    expect(reels[0].is_active).toBe(false);

    await (await reelOne()).DELETE(req('DELETE'), ctx('r2'));
    expect(reels.map((r) => r.id)).toEqual(['r1']);
    expect(removed[0]).toEqual(['reels/2.mp4']);
  });
});
