import { reelLink } from '@/lib/homeContent';

/**
 * Autoplaying reels from a pasted link — via the official Instagram API. Only reels on our own account can be fetched.
 * The token lives in INSTAGRAM_ACCESS_TOKEN (server only) and can be either:
 *  - an Instagram Login token ("IG…") → graph.instagram.com/me/media
 *  - a Meta business / system-user token ("EAA…", Business settings → System users) → graph.facebook.com/<ig-account>/media.
 *    The Instagram account id is looked up from the token, or taken from INSTAGRAM_USER_ID when set.
 */
export class InstagramImportError extends Error {}

const IG_GRAPH = 'https://graph.instagram.com/v21.0';
const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const FIELDS = 'id,media_type,media_product_type,shortcode,permalink,media_url,thumbnail_url';
const MAX_PAGES = 10; // ~500 most recent posts

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Graph API JSON
type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
type Media = { media_type?: string; shortcode?: string; permalink?: string; media_url?: string; thumbnail_url?: string };

const codeOf = (link: string) => link.split('/').filter(Boolean).pop()!;
const isBusinessToken = (token: string) => token.startsWith('EAA');

async function graphGet(fetchImpl: FetchLike, url: string) {
  const res = await fetchImpl(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body?.error?.code === 190) {
      throw new InstagramImportError('Your Instagram connection has expired. Create a new access token and update INSTAGRAM_ACCESS_TOKEN.');
    }
    throw new InstagramImportError('Instagram did not respond. Please try again in a minute.');
  }
  return body;
}

/** First URL of our media list, for either kind of token. */
async function firstMediaUrl(token: string, fetchImpl: FetchLike, igUserId?: string): Promise<string> {
  const params = new URLSearchParams({ fields: FIELDS, limit: '50', access_token: token });
  if (!isBusinessToken(token)) return `${IG_GRAPH}/me/media?${params}`;

  let id = igUserId?.trim();
  if (!id) {
    const accounts = await graphGet(fetchImpl, `${FB_GRAPH}/me/assigned_instagram_accounts?${new URLSearchParams({ fields: 'id,username', access_token: token })}`);
    id = accounts?.data?.[0]?.id;
    if (!id) throw new InstagramImportError('No Instagram account is assigned to this token. In Business settings → System users, assign @thewar.culture to it.');
  }
  return `${FB_GRAPH}/${id}/media?${params}`;
}

/** Finds one of our own reels by its link: { videoUrl, coverUrl, link } or null if it isn't on our account. */
export async function findOwnReel(token: string, link: string, fetchImpl: FetchLike = fetch as unknown as FetchLike, igUserId?: string) {
  const tidy = reelLink(link);
  if (!tidy) throw new InstagramImportError('Paste an Instagram reel link (instagram.com/reel/…).');
  const code = codeOf(tidy);

  let url: string | null = await firstMediaUrl(token, fetchImpl, igUserId);
  for (let i = 0; url && i < MAX_PAGES; i++) {
    const body = await graphGet(fetchImpl, url);
    const match = (body.data ?? []).find((m: Media) =>
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
