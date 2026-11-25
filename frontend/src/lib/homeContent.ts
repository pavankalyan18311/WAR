/** Admin-managed homepage content: scrolling banner and Instagram reels. */

export class HomeContentError extends Error {}

export interface MarqueeSettings {
  enabled: boolean;
  items: string[];
  background: string;
  text_color: string;
  accent_color: string;
}

export const DEFAULT_MARQUEE: MarqueeSettings = {
  enabled: true,
  items: ['Without Any Regrets', 'Oversized', 'Heavyweight', 'Drop 01', 'Made to be lived in'],
  background: '#161412',
  text_color: '#F5F2EC',
  accent_color: '#F36E21',
};

export interface Reel {
  id: string;
  /** Uploaded video; null for a reel added by Instagram link only (shown with Instagram's player). */
  video_url: string | null;
  poster_url: string | null;
  link_url: string | null;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
}

const HEX = /^#[0-9a-f]{6}$/i;
const fail = (msg: string): never => { throw new HomeContentError(msg); };

export function parseMarqueeInput(body: any): MarqueeSettings {
  const items = (Array.isArray(body?.items) ? body.items : [])
    .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean);
  if (items.length === 0) fail('Add at least one banner text.');
  if (items.length > 12) fail('Use at most 12 banner texts.');
  if (items.some((t: string) => t.length > 40)) fail('Keep each banner text under 40 characters.');
  const colours = [body?.background, body?.text_color, body?.accent_color];
  if (!colours.every((c) => typeof c === 'string' && HEX.test(c))) fail('Colours must be hex codes like #F36E21.');
  return {
    enabled: body?.enabled !== false,
    items,
    background: body.background.toUpperCase(),
    text_color: body.text_color.toUpperCase(),
    accent_color: body.accent_color.toUpperCase(),
  };
}

/** An instagram.com link (profile or reel) or "@handle" → full https link; empty → null. */
export function parseInstagramUrl(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return null;
  const handle = /^@?([a-z0-9._]{1,30})$/i.exec(v);
  if (handle && !v.includes('/')) return `https://www.instagram.com/${handle[1]}/`;
  try {
    const url = new URL(v);
    if (url.protocol === 'https:' && /(^|\.)instagram\.com$/i.test(url.hostname)) return url.toString();
  } catch { /* fall through */ }
  return fail('Enter an Instagram link (instagram.com/…) or @handle.');
}

// instagram.com/reel/CODE, /p/CODE, /tv/CODE — optionally with the account name first (/war.wear/reel/CODE)
const REEL_LINK = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/i;

/** A reel/post link in its tidy form (https://www.instagram.com/reel/CODE/), or null if it isn't one. */
export function reelLink(input: unknown): string | null {
  const m = typeof input === 'string' ? REEL_LINK.exec(input.trim()) : null;
  if (!m) return null;
  const kind = m[1].toLowerCase() === 'p' ? 'p' : m[1].toLowerCase() === 'tv' ? 'tv' : 'reel';
  return `https://www.instagram.com/${kind}/${m[2]}/`;
}

/** Instagram's official embed player for a reel/post link; null for profile links. */
export function instagramEmbedUrl(link: string | null | undefined): string | null {
  const tidy = reelLink(link);
  return tidy ? `${tidy}embed/` : null;
}

/** A reel is either an uploaded video (link optional) or just an Instagram reel/post link. */
export function parseReelInput(body: any): { video_url: string | null; poster_url: string | null; link_url: string | null; caption: string | null } {
  const video = typeof body?.video_url === 'string' ? body.video_url.trim() : '';
  const caption = typeof body?.caption === 'string' ? body.caption.trim().slice(0, 120) : '';
  if (!video) {
    const link = reelLink(body?.link_url);
    if (!link) fail('Paste an Instagram reel link (instagram.com/reel/…) or upload a video.');
    return { video_url: null, poster_url: null, link_url: link, caption: caption || null };
  }
  if (!/^https:\/\//.test(video)) fail('Upload a video first.');
  const poster = typeof body?.poster_url === 'string' && /^https:\/\//.test(body.poster_url.trim()) ? body.poster_url.trim() : null;
  return { video_url: video, poster_url: poster, link_url: reelLink(body?.link_url) ?? parseInstagramUrl(body?.link_url), caption: caption || null };
}

/** Homepage data (server): banner, Instagram link and active reels. Falls back to defaults before the migration. */
export async function loadHomeContent(supabase: any): Promise<{ marquee: MarqueeSettings; instagramUrl: string | null; reels: Reel[] }> {
  const [{ data: settings }, { data: reels }] = await Promise.all([
    supabase.from('store_settings').select('home_marquee, instagram_url').eq('id', 1).maybeSingle(),
    supabase.from('home_reels').select('*').eq('is_active', true).order('sort_order').order('created_at').limit(12),
  ]);
  const m = settings?.home_marquee;
  return {
    marquee: m && Array.isArray(m.items) && m.items.length ? { ...DEFAULT_MARQUEE, ...m } : DEFAULT_MARQUEE,
    instagramUrl: settings?.instagram_url ?? null,
    reels: reels ?? [],
  };
}
