import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const uploadToSignedUrl = vi.fn(async () => ({ data: { path: 'reels/abc.mp4' }, error: null }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: (...a: any[]) => (uploadToSignedUrl as any)(...a) }) } }),
}));

import AdminHomepagePage from '@/app/admin/homepage/page';

let reels: any[];
// Instagram not connected by default → link-only reels fall back to Instagram's player.
let importResponse: () => { ok: boolean; json: () => Promise<unknown> };
const fetchMock = vi.fn();
const calls = (method: string, url?: string) => fetchMock.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === method && (!url || u === url));

beforeEach(() => {
  reels = [{ id: 'r1', video_url: 'https://cdn/1.mp4', poster_url: null, link_url: 'https://www.instagram.com/reel/AAA/', caption: 'Drop 02', sort_order: 1, is_active: true }];
  uploadToSignedUrl.mockClear();
  importResponse = () => ({ ok: false, json: async () => ({ code: 'not_connected', error: 'Instagram is not connected yet.' }) });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url === '/api/admin/home' && method === 'GET') return { ok: true, json: async () => ({
      marquee: { enabled: true, items: ['Without Any Regrets', 'Oversized'], background: '#161412', text_color: '#F5F2EC', accent_color: '#F36E21' },
      announcements: { enabled: true, items: ['Free shipping on orders above {free_shipping}', 'Cash on delivery available'] },
      instagram_url: '' }) };
    if (url === '/api/admin/reels' && method === 'GET') return { ok: true, json: async () => ({ reels }) };
    if (url === '/api/admin/reels/import') return importResponse();
    if (url === '/api/admin/uploads/media') return { ok: true, json: async () => ({ path: 'reels/abc.mp4', token: 'tok', publicUrl: 'https://cdn/reels/abc.mp4' }) };
    return { ok: true, json: async () => ({ success: true, reel: { id: 'r2' } }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('Admin → Homepage', () => {
  it('edits the scrolling banner (one text per line + colours) and saves it with the Instagram link', async () => {
    render(<AdminHomepagePage />);
    const texts = await screen.findByLabelText(/banner texts/i);
    await waitFor(() => expect(texts).toHaveValue('Without Any Regrets\nOversized'));
    fireEvent.change(texts, { target: { value: 'Drop 02 is live\nFree shipping above ₹1500' } });
    fireEvent.change(screen.getByLabelText(/background colour/i), { target: { value: '#f36e21' } });
    fireEvent.change(screen.getByLabelText(/instagram profile/i), { target: { value: '@war.wear' } });
    expect(screen.getByTestId('marquee-preview')).toHaveTextContent('Drop 02 is live');
    fireEvent.click(screen.getByRole('button', { name: /save banner/i }));

    await waitFor(() => expect(calls('PUT', '/api/admin/home')).toHaveLength(1));
    expect(JSON.parse(calls('PUT', '/api/admin/home')[0][1].body)).toEqual({
      marquee: { enabled: true, items: ['Drop 02 is live', 'Free shipping above ₹1500'], background: '#f36e21', text_color: '#F5F2EC', accent_color: '#F36E21' },
      instagram_url: '@war.wear',
    });
  });

  it('edits the announcement bar (one message per line) and saves it', async () => {
    render(<AdminHomepagePage />);
    const box = await screen.findByLabelText(/announcement messages/i);
    await waitFor(() => expect(box).toHaveValue('Free shipping on orders above {free_shipping}\nCash on delivery available'));
    fireEvent.change(box, { target: { value: 'Drop 02 is live\nCash on delivery available' } });
    expect(screen.getByTestId('announcement-preview')).toHaveTextContent('Drop 02 is live');
    fireEvent.click(screen.getByLabelText(/show announcement bar/i));
    fireEvent.click(screen.getByRole('button', { name: /save announcements/i }));

    await waitFor(() => expect(calls('PUT', '/api/admin/home')).toHaveLength(1));
    expect(JSON.parse(calls('PUT', '/api/admin/home')[0][1].body)).toEqual({
      announcements: { enabled: false, items: ['Drop 02 is live', 'Cash on delivery available'] },
    });
  });

  it('uploads a reel video straight to storage, then adds it with its Instagram link', async () => {
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    const file = new File(['x'.repeat(100)], 'reel.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText(/reel video/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/^instagram link for this reel/i), { target: { value: 'https://www.instagram.com/reel/BBB/' } });
    fireEvent.change(screen.getByLabelText(/^caption/i), { target: { value: 'New fit' } });
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));

    await waitFor(() => expect(calls('POST', '/api/admin/reels')).toHaveLength(1));
    expect(JSON.parse(calls('POST', '/api/admin/uploads/media')[0][1].body)).toEqual({ content_type: 'video/mp4', size: 100 });
    expect(uploadToSignedUrl).toHaveBeenCalledWith('reels/abc.mp4', 'tok', file, expect.objectContaining({ contentType: 'video/mp4' }));
    expect(JSON.parse(calls('POST', '/api/admin/reels')[0][1].body)).toEqual({
      video_url: 'https://cdn/reels/abc.mp4', link_url: 'https://www.instagram.com/reel/BBB/', caption: 'New fit',
    });
  });

  it('imports a reel from just its link so it autoplays (Instagram connected)', async () => {
    importResponse = () => ({ ok: true, json: async () => ({ reel: { id: 'r2' } }) });
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    fireEvent.change(screen.getByLabelText(/^instagram link for this reel/i), { target: { value: 'https://www.instagram.com/reel/CCC/' } });
    fireEvent.change(screen.getByLabelText(/^caption/i), { target: { value: 'Drop 03' } });
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));

    await waitFor(() => expect(calls('POST', '/api/admin/reels/import')).toHaveLength(1));
    expect(JSON.parse(calls('POST', '/api/admin/reels/import')[0][1].body)).toEqual({ link_url: 'https://www.instagram.com/reel/CCC/', caption: 'Drop 03' });
    expect(await screen.findByRole('status')).toHaveTextContent(/plays automatically/i);
    expect(calls('POST', '/api/admin/reels')).toHaveLength(0);
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });

  it('falls back to Instagram\'s player when Instagram is not connected (or the reel is not ours)', async () => {
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    fireEvent.change(screen.getByLabelText(/^instagram link for this reel/i), { target: { value: 'https://www.instagram.com/reel/CCC/' } });
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));

    await waitFor(() => expect(calls('POST', '/api/admin/reels')).toHaveLength(1));
    expect(calls('POST', '/api/admin/uploads/media')).toHaveLength(0);
    expect(JSON.parse(calls('POST', '/api/admin/reels')[0][1].body)).toEqual({ link_url: 'https://www.instagram.com/reel/CCC/', caption: '' });
    expect(await screen.findByRole('status')).toHaveTextContent(/instagram's player.*not connected/i);
  });

  it('shows Instagram errors (e.g. expired token) instead of silently falling back', async () => {
    importResponse = () => ({ ok: false, json: async () => ({ code: 'instagram_error', error: 'Your Instagram connection has expired.' }) });
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    fireEvent.change(screen.getByLabelText(/^instagram link for this reel/i), { target: { value: 'https://www.instagram.com/reel/CCC/' } });
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your Instagram connection has expired.');
    expect(calls('POST', '/api/admin/reels')).toHaveLength(0);
  });

  it('asks for a video or a link when both are empty', async () => {
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Paste an Instagram reel link or choose a video.');
    expect(calls('POST', '/api/admin/reels')).toHaveLength(0);
  });

  it('hides and deletes a reel', async () => {
    render(<AdminHomepagePage />);
    const card = (await screen.findByText('Drop 02')).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: /hide/i }));
    await waitFor(() => expect(calls('PATCH', '/api/admin/reels/r1')).toHaveLength(1));
    expect(JSON.parse(calls('PATCH', '/api/admin/reels/r1')[0][1].body)).toEqual({ is_active: false });

    fireEvent.click(within(card).getByRole('button', { name: /delete/i }));
    fireEvent.click(within(card).getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(calls('DELETE', '/api/admin/reels/r1')).toHaveLength(1));
  });
});
