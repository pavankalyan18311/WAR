import { describe, it, expect, vi } from 'vitest';
import { findOwnReel, InstagramImportError } from '@/lib/instagramImport';

const page = (data: any[], next?: string) => ({ ok: true, status: 200, json: async () => ({ data, paging: next ? { next } : {} }) });
const reel = (code: string, extra = {}) => ({
  id: `id-${code}`, media_type: 'VIDEO', shortcode: code, permalink: `https://www.instagram.com/reel/${code}/`,
  media_url: `https://cdn.ig/${code}.mp4`, thumbnail_url: `https://cdn.ig/${code}.jpg`, ...extra,
});

describe('findOwnReel (Instagram API — reels on our own account)', () => {
  it('finds the reel by its link and returns the video + cover image', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(page([reel('AAA'), reel('BBB')]));
    const found = await findOwnReel('tok', 'https://www.instagram.com/war.wear/reel/BBB/?igsh=x', fetchMock);
    expect(found).toEqual({ videoUrl: 'https://cdn.ig/BBB.mp4', coverUrl: 'https://cdn.ig/BBB.jpg', link: 'https://www.instagram.com/reel/BBB/' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin).toBe('https://graph.instagram.com');
    expect(url.pathname).toMatch(/\/me\/media$/);
    expect(url.searchParams.get('access_token')).toBe('tok');
    expect(url.searchParams.get('fields')).toContain('media_url');
  });

  it('looks through older posts page by page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([reel('AAA')], 'https://graph.instagram.com/next-page'))
      .mockResolvedValueOnce(page([reel('OLD')]));
    expect((await findOwnReel('tok', 'https://www.instagram.com/reel/OLD/', fetchMock))?.videoUrl).toBe('https://cdn.ig/OLD.mp4');
    expect(fetchMock.mock.calls[1][0]).toBe('https://graph.instagram.com/next-page');
  });

  it('returns null when the reel is not on our account (or is a photo)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(page([reel('AAA'), reel('PIC', { media_type: 'IMAGE' })]));
    expect(await findOwnReel('tok', 'https://www.instagram.com/reel/ZZZ/', fetchMock)).toBeNull();
    expect(await findOwnReel('tok', 'https://www.instagram.com/p/PIC/', fetchMock)).toBeNull();
  });

  it('explains when the Instagram connection has expired or is wrong', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'expired' } }) });
    await expect(findOwnReel('tok', 'https://www.instagram.com/reel/AAA/', fetchMock))
      .rejects.toThrow(new InstagramImportError('Your Instagram connection has expired. Create a new access token and update INSTAGRAM_ACCESS_TOKEN.'));
  });

  describe('with a Meta business (system user) token — "EAA…"', () => {
    const accounts = { ok: true, status: 200, json: async () => ({ data: [{ id: '1784', username: 'thewar.culture' }] }) };

    it('finds our Instagram account first, then reads its media from graph.facebook.com', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(accounts).mockResolvedValueOnce(page([reel('AAA'), reel('BBB')]));
      const found = await findOwnReel('EAAtok', 'https://www.instagram.com/reel/BBB/', fetchMock);
      expect(found).toEqual({ videoUrl: 'https://cdn.ig/BBB.mp4', coverUrl: 'https://cdn.ig/BBB.jpg', link: 'https://www.instagram.com/reel/BBB/' });

      const first = new URL(fetchMock.mock.calls[0][0]);
      expect(first.origin).toBe('https://graph.facebook.com');
      expect(first.pathname).toMatch(/\/me\/assigned_instagram_accounts$/);
      expect(first.searchParams.get('access_token')).toBe('EAAtok');

      const media = new URL(fetchMock.mock.calls[1][0]);
      expect(media.origin).toBe('https://graph.facebook.com');
      expect(media.pathname).toMatch(/\/1784\/media$/);
      expect(media.searchParams.get('fields')).toContain('media_url');
    });

    it('uses a given Instagram account id without looking it up', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(page([reel('AAA')]));
      await findOwnReel('EAAtok', 'https://www.instagram.com/reel/AAA/', fetchMock, '999');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(new URL(fetchMock.mock.calls[0][0]).pathname).toMatch(/\/999\/media$/);
    });

    it('explains when no Instagram account is assigned to the token', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });
      await expect(findOwnReel('EAAtok', 'https://www.instagram.com/reel/AAA/', fetchMock))
        .rejects.toThrow(/no instagram account is assigned/i);
    });

    it('explains an expired or revoked token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 190 } }) });
      await expect(findOwnReel('EAAtok', 'https://www.instagram.com/reel/AAA/', fetchMock)).rejects.toThrow(/expired/i);
    });
  });

  it('rejects links that are not reels', async () => {
    await expect(findOwnReel('tok', 'https://www.instagram.com/war.wear/', vi.fn()))
      .rejects.toThrow('Paste an Instagram reel link (instagram.com/reel/…).');
  });
});
