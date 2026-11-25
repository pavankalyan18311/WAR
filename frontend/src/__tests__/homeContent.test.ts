import { describe, expect, it } from 'vitest';
import { DEFAULT_MARQUEE, HomeContentError, instagramEmbedUrl, parseInstagramUrl, parseMarqueeInput, parseReelInput } from '@/lib/homeContent';

describe('parseMarqueeInput (scrolling banner)', () => {
  it('accepts text items and colours, tidying them', () => {
    expect(parseMarqueeInput({ enabled: true, items: [' Drop 02 ', 'Heavyweight', ''], background: '#F36E21', text_color: '#ffffff', accent_color: '#161412' }))
      .toEqual({ enabled: true, items: ['Drop 02', 'Heavyweight'], background: '#F36E21', text_color: '#FFFFFF', accent_color: '#161412' });
  });
  it.each([
    [{ items: [] }, 'Add at least one banner text.'],
    [{ items: ['x'.repeat(41)] }, 'Keep each banner text under 40 characters.'],
    [{ items: Array(13).fill('a') }, 'Use at most 12 banner texts.'],
    [{ background: 'red' }, 'Colours must be hex codes like #F36E21.'],
    [{ text_color: '#12345' }, 'Colours must be hex codes like #F36E21.'],
  ])('rejects %j', (patch, message) => {
    expect(() => parseMarqueeInput({ ...DEFAULT_MARQUEE, ...patch })).toThrow(new HomeContentError(message));
  });
});

describe('parseInstagramUrl', () => {
  it('accepts an instagram profile/reel link or a handle', () => {
    expect(parseInstagramUrl('https://www.instagram.com/war.wear/')).toBe('https://www.instagram.com/war.wear/');
    expect(parseInstagramUrl('@war.wear')).toBe('https://www.instagram.com/war.wear/');
    expect(parseInstagramUrl('')).toBeNull();
  });
  it('rejects other websites', () => {
    expect(() => parseInstagramUrl('https://evil.example.com/x')).toThrow('Enter an Instagram link (instagram.com/…) or @handle.');
  });
});

describe('parseReelInput', () => {
  const base = { video_url: 'https://abc.supabase.co/storage/v1/object/public/media/reels/1.mp4', link_url: 'https://www.instagram.com/reel/C8abc/', caption: ' New drop ' };
  it('accepts a stored video with an Instagram link', () => {
    expect(parseReelInput(base)).toEqual({ ...base, caption: 'New drop', poster_url: null });
  });
  it('video must be an https link; link must be Instagram', () => {
    expect(() => parseReelInput({ ...base, video_url: 'http://x/1.mp4' })).toThrow('Upload a video first.');
    expect(() => parseReelInput({ ...base, link_url: 'https://youtube.com/x' })).toThrow('Enter an Instagram link (instagram.com/…) or @handle.');
  });
  it('link is optional (falls back to the profile link)', () => {
    expect(parseReelInput({ ...base, link_url: '' }).link_url).toBeNull();
  });
  it('accepts just an Instagram reel link (no upload), tidying it', () => {
    expect(parseReelInput({ link_url: 'https://instagram.com/reels/C8abc_-1/?igsh=xyz', caption: '' }))
      .toEqual({ video_url: null, poster_url: null, link_url: 'https://www.instagram.com/reel/C8abc_-1/', caption: null });
    expect(parseReelInput({ link_url: 'https://www.instagram.com/p/DAbc/' }).link_url).toBe('https://www.instagram.com/p/DAbc/');
    // Newer share links include the account name
    expect(parseReelInput({ link_url: 'https://www.instagram.com/war.wear/reel/Dehl7Xohfah/?utm_source=ig_web' }).link_url)
      .toBe('https://www.instagram.com/reel/Dehl7Xohfah/');
  });
  it('without an upload, the link must point to a reel or post (not a profile)', () => {
    const msg = 'Paste an Instagram reel link (instagram.com/reel/…) or upload a video.';
    expect(() => parseReelInput({ link_url: 'https://www.instagram.com/war.wear/' })).toThrow(msg);
    expect(() => parseReelInput({})).toThrow(msg);
  });
});

describe('instagramEmbedUrl', () => {
  it('turns a reel/post link into Instagram’s official embed player address', () => {
    expect(instagramEmbedUrl('https://www.instagram.com/reel/C8abc/')).toBe('https://www.instagram.com/reel/C8abc/embed/');
    expect(instagramEmbedUrl('https://www.instagram.com/p/DAbc/?x=1')).toBe('https://www.instagram.com/p/DAbc/embed/');
  });
  it('returns null for profile links or nothing', () => {
    expect(instagramEmbedUrl('https://www.instagram.com/war.wear/')).toBeNull();
    expect(instagramEmbedUrl(null)).toBeNull();
  });
});
