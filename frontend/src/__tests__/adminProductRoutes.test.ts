// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin
      ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const saveProduct = vi.fn();
vi.mock('@/lib/admin/products', async (orig) => ({
  ...(await orig<any>()),
  saveProduct: (...a: any[]) => saveProduct(...a),
}));

const upload = vi.fn();
const inserted: any[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: { from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/products/${p}` } }) }) },
    from: () => ({
      insert: (row: any) => { inserted.push(row); return { select: () => ({ single: async () => ({ data: { id: 'new-id', ...row }, error: null }) }) }; },
    }),
  }),
}));

const validProduct = {
  name: 'Tee', status: 'draft', images: [],
  variants: [{ color_id: 'c', size_option_id: 's', price: 500, compare_at_price: null, stock: 1 }],
};
const json = (method: string, body: any) => new Request('http://x', { method, body: JSON.stringify(body) });

beforeEach(() => { vi.clearAllMocks(); isAdmin = true; inserted.length = 0; saveProduct.mockResolvedValue('prod-1'); });

describe('/api/admin/products', () => {
  it('POST is admin-only', async () => {
    isAdmin = false;
    const { POST } = await import('@/app/api/admin/products/route');
    expect((await POST(json('POST', validProduct))).status).toBe(403);
    expect(saveProduct).not.toHaveBeenCalled();
  });

  it('POST returns 400 with the form error', async () => {
    const { POST } = await import('@/app/api/admin/products/route');
    const res = await POST(json('POST', { ...validProduct, name: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Product name is required.');
  });

  it('POST creates and returns the id', async () => {
    const { POST } = await import('@/app/api/admin/products/route');
    const res = await POST(json('POST', validProduct));
    expect(await res.json()).toEqual({ success: true, id: 'prod-1' });
    expect(saveProduct).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'Tee' }));
  });

  it('PUT updates the product from the URL', async () => {
    const { PUT } = await import('@/app/api/admin/products/[id]/route');
    await PUT(json('PUT', validProduct), { params: Promise.resolve({ id: 'prod-9' }) });
    expect(saveProduct).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'prod-9');
  });

  it('returns 500 (not success) when saving fails', async () => {
    saveProduct.mockRejectedValue(new Error('db down'));
    const { POST } = await import('@/app/api/admin/products/route');
    expect((await POST(json('POST', validProduct))).status).toBe(500);
  });
});

describe('/api/admin/uploads', () => {
  const form = (file: File) => { const f = new FormData(); f.append('file', file); return new Request('http://x', { method: 'POST', body: f }); };

  it('is admin-only', async () => {
    isAdmin = false;
    const { POST } = await import('@/app/api/admin/uploads/route');
    expect((await POST(form(new File(['x'], 'a.jpg', { type: 'image/jpeg' })))).status).toBe(403);
  });

  it('rejects non-images and files over 5 MB', async () => {
    const { POST } = await import('@/app/api/admin/uploads/route');
    expect((await POST(form(new File(['x'], 'a.pdf', { type: 'application/pdf' })))).status).toBe(400);
    expect((await POST(form(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads an image and returns its public https URL', async () => {
    upload.mockResolvedValue({ error: null });
    const { POST } = await import('@/app/api/admin/uploads/route');
    const body = await (await POST(form(new File(['x'], 'tee.png', { type: 'image/png' })))).json();
    expect(body.url).toMatch(/^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/products\/.+\.png$/);
  });
});

describe('/api/admin/catalog-options', () => {
  it('creates a colour', async () => {
    const { POST } = await import('@/app/api/admin/catalog-options/route');
    const res = await POST(json('POST', { kind: 'color', name: ' Olive ', hex: '#3F6212' }));
    expect(res.status).toBe(200);
    expect(inserted[0]).toEqual({ name: 'Olive', color_code: '#3F6212' });
  });

  it('creates a category with a slug', async () => {
    const { POST } = await import('@/app/api/admin/catalog-options/route');
    await POST(json('POST', { kind: 'category', name: 'Graphic Tees' }));
    expect(inserted[0]).toEqual({ name: 'Graphic Tees', slug: 'graphic-tees' });
  });

  it('rejects unknown kinds and empty names', async () => {
    const { POST } = await import('@/app/api/admin/catalog-options/route');
    expect((await POST(json('POST', { kind: 'brand', name: 'X' }))).status).toBe(400);
    expect((await POST(json('POST', { kind: 'size', name: '  ' }))).status).toBe(400);
  });
});
