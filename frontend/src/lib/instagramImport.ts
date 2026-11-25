import { reelLink } from '@/lib/homeContent';

/**
 * Autoplaying reels from a pasted link — via the official Instagram API (Instagram Login, professional account).
 * Only reels on our own connected account can be fetched; the token lives in INSTAGRAM_ACCESS_TOKEN (server only).
 */
export class InstagramImportError extends Error {}

const GRAPH = 'https://graph.instagram.com/v21.0';
const FIELDS = 'id,media_type,media_product_type,shortcode,permalink,media_url,thumbnail_url';
const MAX_PAGES = 10; // ~500 most recent posts

type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

const codeOf = (link: string) => link.split('/').filter(Boolean).pop()!;

/** Finds one of our own reels by its link: { videoUrl, coverUrl, link } or null if it isn't on our account. */
export async function findOwnReel(token: string, link: string, fetchImpl: FetchLike = fetch as any) {
  const tidy = reelLink(link);
  if (!tidy) throw new InstagramImportError('Paste an Instagram reel link (instagram.com/reel/…).');
  const code = codeOf(tidy);

  let url: string | null = `${GRAPH}/me/media?${new URLSearchParams({ fields: FIELDS, limit: '50', access_token: token })}`;
  for (let i = 0; url && i < MAX_PAGES; i++) {
    const res = await fetchImpl(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body?.error?.code === 190) {
        throw new InstagramImportError('Your Instagram connection has expired. Create a new access token and update INSTAGRAM_ACCESS_TOKEN.');
      }
      throw new InstagramImportError('Instagram did not respond. Please try again in a minute.');
    }
    const match = (body.data ?? []).find((m: any) =>
      m.shortcode === code || (typeof m.permalink === 'string' && codeOf(m.permalink.split('?')[0]) === code));
    if (match) {
      return match.media_type === 'VIDEO' && match.media_url
        ? { videoUrl: match.media_url as string, coverUrl: (match.thumbnail_url as string) ?? null, link: tidy }
        : null;
    }
    url = body.paging?.next ?? null;
  }
  return null;
}
