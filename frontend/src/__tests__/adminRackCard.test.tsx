/* eslint-disable @typescript-eslint/no-explicit-any -- loose Supabase/fetch mocks, same as the other admin route tests */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({}) } }) }));

import AdminHomepagePage from '@/app/admin/homepage/page';

let tees: any[];
const fetchMock = vi.fn();
const calls = (method: string, url?: string) => fetchMock.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === method && (!url || u === url));
const body = (call: any[]) => JSON.parse(call[1].body);

beforeEach(() => {
  tees = [
    { id: 't1', name: 'Ashen Halo Tee', price: 1499, front_url: '/images/rack/ashen-halo-front.jpg', back_url: '/images/rack/ashen-halo-back.jpg', link_url: null, sort_order: 1, is_active: true, is_featured: false },
    { id: 't2', name: 'Three Sword Jersey', price: 1799, front_url: '/images/rack/zoro-green-front.jpg', back_url: null, link_url: '/products/zoro', sort_order: 2, is_active: true, is_featured: true },
  ];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url === '/api/admin/home') return { ok: true, json: async () => ({ marquee: { enabled: true, items: ['A'], background: '#161412', text_color: '#F5F2EC', accent_color: '#F36E21' }, instagram_url: '' }) };
    if (url === '/api/admin/reels') return { ok: true, json: async () => ({ reels: [] }) };
    if (url === '/api/admin/rack' && method === 'GET') return { ok: true, json: async () => ({ tees }) };
    if (url === '/api/admin/products') return { ok: true, json: async () => ({ products: [{ id: 'p1', name: 'Zoro Jersey', slug: 'zoro-jersey' }] }) };
    if (url === '/api/admin/uploads') return { ok: true, json: async () => ({ url: `https://abc.supabase.co/storage/v1/object/public/products/products/${init.body.get('file').name}` }) };
    return { ok: true, json: async () => ({ success: true }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

const rackCard = async () => {
  const heading = await screen.findByRole('heading', { name: /rack tees/i });
  return heading.closest('section') as HTMLElement;
};
const teeItem = async (name: string) => {
  const card = await rackCard();
  const input = await within(card).findByDisplayValue(name);
  return input.closest('li') as HTMLElement;
};

describe('Admin → Homepage → Rack tees', () => {
  it('lists the tees in rail order with their photos, and marks the one that faces forward first', async () => {
    render(<AdminHomepagePage />);
    const zoro = await teeItem('Three Sword Jersey');
    expect(within(zoro).getByText(/faces forward first/i)).toBeInTheDocument();
    expect(within(zoro).getByAltText('Three Sword Jersey — front')).toHaveAttribute('src', '/images/rack/zoro-green-front.jpg');
    expect(within(zoro).getByText(/no back photo/i)).toBeInTheDocument();
  });

  it('uploads front and back photos, then adds the tee', async () => {
    render(<AdminHomepagePage />);
    const card = await rackCard();
    fireEvent.change(within(card).getByLabelText(/^new tee name/i), { target: { value: 'Thunder Stripe Tee' } });
    fireEvent.change(within(card).getByLabelText(/^new tee price/i), { target: { value: '1699' } });
    fireEvent.change(within(card).getByLabelText(/^new tee front photo/i), { target: { files: [new File(['f'], 'front.jpg', { type: 'image/jpeg' })] } });
    fireEvent.change(within(card).getByLabelText(/^new tee back photo/i), { target: { files: [new File(['b'], 'back.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(within(card).getByRole('button', { name: /add tee/i }));

    await waitFor(() => expect(calls('POST', '/api/admin/rack')).toHaveLength(1));
    expect(calls('POST', '/api/admin/uploads')).toHaveLength(2);
    expect(body(calls('POST', '/api/admin/rack')[0])).toEqual({
      name: 'Thunder Stripe Tee', price: '1699',
      front_url: 'https://abc.supabase.co/storage/v1/object/public/products/products/front.jpg',
      back_url: 'https://abc.supabase.co/storage/v1/object/public/products/products/back.jpg',
    });
  });

  it('has no product-link setting (tees flip on the rack; "Shop the drop" goes to the shop page)', async () => {
    render(<AdminHomepagePage />);
    const card = await rackCard();
    await within(card).findByDisplayValue('Ashen Halo Tee');
    expect(within(card).queryByLabelText(/links to/i)).toBeNull();
  });

  it('needs a name, price and front photo before adding', async () => {
    render(<AdminHomepagePage />);
    const card = await rackCard();
    fireEvent.click(within(card).getByRole('button', { name: /add tee/i }));
    expect(await within(card).findByRole('alert')).toHaveTextContent(/name, price and front photo/i);
    expect(calls('POST', '/api/admin/rack')).toHaveLength(0);
  });

  it('edits a tee name and price', async () => {
    render(<AdminHomepagePage />);
    const ashen = await teeItem('Ashen Halo Tee');
    fireEvent.change(within(ashen).getByLabelText(/^name/i), { target: { value: 'Ashen Halo' } });
    fireEvent.change(within(ashen).getByLabelText(/^price/i), { target: { value: '1599' } });
    fireEvent.click(within(ashen).getByRole('button', { name: /^save/i }));
    await waitFor(() => expect(calls('PATCH', '/api/admin/rack/t1')).toHaveLength(1));
    expect(body(calls('PATCH', '/api/admin/rack/t1')[0])).toEqual({ name: 'Ashen Halo', price: '1599' });
  });

  it('replaces a back photo', async () => {
    render(<AdminHomepagePage />);
    const zoro = await teeItem('Three Sword Jersey');
    fireEvent.change(within(zoro).getByLabelText(/replace back photo/i), { target: { files: [new File(['b'], 'zoro-back.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(calls('PATCH', '/api/admin/rack/t2')).toHaveLength(1));
    expect(body(calls('PATCH', '/api/admin/rack/t2')[0])).toEqual({ back_url: 'https://abc.supabase.co/storage/v1/object/public/products/products/zoro-back.jpg' });
  });

  it('makes a tee face forward first, hides it, reorders it and deletes it', async () => {
    render(<AdminHomepagePage />);
    const ashen = await teeItem('Ashen Halo Tee');
    fireEvent.click(within(ashen).getByRole('button', { name: /face forward first/i }));
    await waitFor(() => expect(calls('PATCH', '/api/admin/rack/t1')).toHaveLength(1));
    expect(body(calls('PATCH', '/api/admin/rack/t1')[0])).toEqual({ is_featured: true });

    fireEvent.click(within(await teeItem('Ashen Halo Tee')).getByRole('button', { name: /hide/i }));
    await waitFor(() => expect(calls('PATCH', '/api/admin/rack/t1')).toHaveLength(2));
    expect(body(calls('PATCH', '/api/admin/rack/t1')[1])).toEqual({ is_active: false });

    fireEvent.click(within(await teeItem('Ashen Halo Tee')).getByRole('button', { name: /move right/i }));
    await waitFor(() => expect(calls('PATCH', '/api/admin/rack/t2')).toHaveLength(1));
    expect(body(calls('PATCH', '/api/admin/rack/t1')[2])).toEqual({ sort_order: 2 });
    expect(body(calls('PATCH', '/api/admin/rack/t2')[0])).toEqual({ sort_order: 1 });

    fireEvent.click(within(await teeItem('Ashen Halo Tee')).getByRole('button', { name: /delete/i }));
    fireEvent.click(within(await teeItem('Ashen Halo Tee')).getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(calls('DELETE', '/api/admin/rack/t1')).toHaveLength(1));
  });
});
