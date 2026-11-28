// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose Supabase/fetch mocks, same as the other admin route tests */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));

const findOwnReel = vi.fn();
vi.mock('@/lib/instagramImport', async (orig) => ({ ...(await orig<any>()), findOwnReel: (...a: any[]) => findOwnReel(...a) }));

let reels: any[];
const uploads: { bucket: string; path: string; contentType: string; size: number }[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: ArrayBuffer, opts: any) => { uploads.push({ bucket, path, contentType: opts.contentType, size: body.byteLength }); return { error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
    from: () => {
      let inserted: any = null;
      const b: any = {
        select: () => b,
        insert: (p: any) => { inserted = { id: `r${reels.length + 1}`, ...p }; reels.push(inserted); return b; },
        single: async () => ({ data: inserted, error: null }),
        then: (resolve: any) => resolve({ data: reels, error: null }),
      };
      return b;
    },
  }),
}));

const download = vi.fn();
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const route = () => import('@/app/api/admin/reels/import/route');
const LINK = 'https://www.instagram.com/reel/DfM14ekRq2X/?utm_source=ig_embed';
const bytes = (n: number, type: string) => ({ ok: true, headers: new Headers({ 'content-type': type }), arrayBuffer: async () => new ArrayBuffer(n) });

beforeEach(() => {
  isAdmin = true;
  reels = [{ id: 'r1', sort_order: 4 }];
  uploads.length = 0;
  findOwnReel.mockReset();
  download.mockReset();
  vi.stubGlobal('fetch', download);
  vi.stubEnv('INSTAGRAM_ACCESS_TOKEN', 'tok');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('POST /api/admin/reels/import', () => {
  it('is admin-only', async () => {
    isAdmin = false;
    expect((await (await route()).POST(req({ link_url: LINK }))).status).toBe(403);
  });

  it('says Instagram is not connected when there is no access token', async () => {
    vi.stubEnv('INSTAGRAM_ACCESS_TOKEN', '');
    const res = await (await route()).POST(req({ link_url: LINK }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'not_connected' });
    expect(findOwnReel).not.toHaveBeenCalled();
  });

  it('copies the reel video and cover into storage and adds an autoplaying reel at the end', async () => {
    findOwnReel.mockResolvedValue({ videoUrl: 'https://cdn.ig/v.mp4', coverUrl: 'https://cdn.ig/c.jpg', link: 'https://www.instagram.com/reel/DfM14ekRq2X/' });
    download.mockImplementation(async (url: string) => (url.endsWith('.mp4') ? bytes(1000, 'video/mp4') : bytes(200, 'image/jpeg')));

    const res = await (await route()).POST(req({ link_url: LINK, caption: '  Drop 02 ' }));
    expect(res.status).toBe(200);
    expect(findOwnReel).toHaveBeenCalledWith('tok', LINK, undefined, undefined);

    expect(uploads).toEqual([
      expect.objectContaining({ bucket: 'media', path: expect.stringMatching(/^reels\/.+\.mp4$/), contentType: 'video/mp4', size: 1000 }),
      expect.objectContaining({ bucket: 'media', path: expect.stringMatching(/^posters\/.+\.jpg$/), contentType: 'image/jpeg', size: 200 }),
    ]);
    const added = reels.at(-1);
    expect(added).toMatchObject({
      video_url: expect.stringMatching(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/public\/media\/reels\/.+\.mp4$/),
      poster_url: expect.stringMatching(/\/media\/posters\/.+\.jpg$/),
      link_url: 'https://www.instagram.com/reel/DfM14ekRq2X/',
      caption: 'Drop 02', sort_order: 5, is_active: true,
    });
  });

  it('still adds the reel when the cover image cannot be copied', async () => {
    findOwnReel.mockResolvedValue({ videoUrl: 'https://cdn.ig/v.mp4', coverUrl: 'https://cdn.ig/c.jpg', link: 'https://www.instagram.com/reel/AAA/' });
    download.mockImplementation(async (url: string) => (url.endsWith('.mp4') ? bytes(1000, 'video/mp4') : { ok: false, headers: new Headers() }));
    expect((await (await route()).POST(req({ link_url: LINK }))).status).toBe(200);
    expect(reels.at(-1)).toMatchObject({ poster_url: null });
  });

  it('says when the reel is not on the connected account', async () => {
    findOwnReel.mockResolvedValue(null);
    const res = await (await route()).POST(req({ link_url: LINK }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'not_found' });
  });

  it('passes on Instagram errors (expired token, bad link) as a clear message', async () => {
    const { InstagramImportError } = await import('@/lib/instagramImport');
    findOwnReel.mockRejectedValue(new InstagramImportError('Your Instagram connection has expired.'));
    const res = await (await route()).POST(req({ link_url: LINK }));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'instagram_error', error: 'Your Instagram connection has expired.' });
  });

  it('refuses videos over 50 MB', async () => {
    findOwnReel.mockResolvedValue({ videoUrl: 'https://cdn.ig/v.mp4', coverUrl: null, link: 'https://www.instagram.com/reel/AAA/' });
    download.mockResolvedValue(bytes(51 * 1024 * 1024, 'video/mp4'));
    const res = await (await route()).POST(req({ link_url: LINK }));
    expect(res.status).toBe(413);
    expect(uploads).toHaveLength(0);
  });
});
