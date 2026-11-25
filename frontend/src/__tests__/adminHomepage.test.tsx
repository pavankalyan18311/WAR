import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const uploadToSignedUrl = vi.fn(async () => ({ data: { path: 'reels/abc.mp4' }, error: null }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: (...a: any[]) => (uploadToSignedUrl as any)(...a) }) } }),
}));

import AdminHomepagePage from '@/app/admin/homepage/page';

let reels: any[];
const fetchMock = vi.fn();
const calls = (method: string, url?: string) => fetchMock.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === method && (!url || u === url));

beforeEach(() => {
  reels = [{ id: 'r1', video_url: 'https://cdn/1.mp4', poster_url: null, link_url: 'https://www.instagram.com/reel/AAA/', caption: 'Drop 02', sort_order: 1, is_active: true }];
  uploadToSignedUrl.mockClear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url === '/api/admin/home' && method === 'GET') return { ok: true, json: async () => ({
      marquee: { enabled: true, items: ['Without Any Regrets', 'Oversized'], background: '#161412', text_color: '#F5F2EC', accent_color: '#F36E21' },
      instagram_url: '' }) };
    if (url === '/api/admin/reels' && method === 'GET') return { ok: true, json: async () => ({ reels }) };
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

  it('adds a reel from just its Instagram link — no upload needed', async () => {
    render(<AdminHomepagePage />);
    await screen.findByText('Drop 02');
    fireEvent.change(screen.getByLabelText(/^instagram link for this reel/i), { target: { value: 'https://www.instagram.com/reel/CCC/' } });
    fireEvent.click(screen.getByRole('button', { name: /add reel/i }));

    await waitFor(() => expect(calls('POST', '/api/admin/reels')).toHaveLength(1));
    expect(calls('POST', '/api/admin/uploads/media')).toHaveLength(0);
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
    expect(JSON.parse(calls('POST', '/api/admin/reels')[0][1].body)).toEqual({ link_url: 'https://www.instagram.com/reel/CCC/', caption: '' });
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
