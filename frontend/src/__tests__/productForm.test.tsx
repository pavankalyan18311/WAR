import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductForm from '@/components/admin/ProductForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/supabase/queries', () => ({
  getCategories: async () => [{ id: 'cat1', name: 'Oversized', slug: 'oversized' }],
  getCollections: async () => [{ id: 'col1', name: 'Summer Drop', slug: 'summer-drop' }],
  getColors: async () => [{ id: 'black', name: 'Black', color_code: '#000000' }],
  getSizeOptions: async () => [{ id: 'm', name: 'M', sort_order: 1 }, { id: 'l', name: 'L', sort_order: 2 }],
}));

async function fillBasics() {
  render(<ProductForm />);
  fireEvent.change(await screen.findByLabelText(/product name/i), { target: { value: 'Shadow Tee' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Black' }));
  fireEvent.click(screen.getByRole('button', { name: 'M' }));
  fireEvent.change(screen.getByLabelText('Selling price for Black / M'), { target: { value: '899' } });
  fireEvent.change(screen.getByLabelText('Stock for Black / M'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Oversized' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Summer Drop' }));
}

/** Fake server: answers the dropdown-options request, and `saveResponse` for the save. */
function mockServer(saveResponse: Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (String(url) === '/api/admin/product-options') {
      return new Response(JSON.stringify({ options: { fabric: [{ id: 'f1', value: '100% Cotton' }], fit: [], pattern: [], sleeve_type: [], neck_type: [], gender: [] } }));
    }
    if (String(url) === '/api/size-charts') {
      return new Response(JSON.stringify({ charts: [{ id: 'tee', name: 'Oversized T-Shirt', is_default: true }, { id: 'hood', name: 'Hoodie', is_default: false }] }));
    }
    return saveResponse;
  });
}
const saveCall = (spy: ReturnType<typeof mockServer>) =>
  spy.mock.calls.find(([u]) => !['/api/admin/product-options', '/api/size-charts'].includes(String(u)))!;

describe('ProductForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); push.mockReset(); });

  it('loads categories, colours, sizes and collections from the database (no hardcoded lists)', async () => {
    render(<ProductForm />);
    expect(await screen.findByRole('checkbox', { name: 'Oversized' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Summer Drop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Black' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mustard' })).not.toBeInTheDocument();
  });

  it('sends a clean product to the admin API and goes back to the list', async () => {
    const fetchSpy = mockServer(new Response('{"success":true,"id":"p1"}', { status: 200 }));
    await fillBasics();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Fabric' }), { target: { value: '100% Cotton' } });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => expect(saveCall(fetchSpy)).toBeTruthy());
    const [url, init] = saveCall(fetchSpy);
    expect(url).toBe('/api/admin/products');
    expect(JSON.parse(init!.body as string)).toMatchObject({
      name: 'Shadow Tee', fabric: '100% Cotton', status: 'draft', category_ids: ['cat1'], collection_ids: ['col1'], images: [],
      variants: [{ color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: null, stock: 12 }],
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/products'));
  });

  it('lets the admin pick a size chart for this product (default = store default chart)', async () => {
    const fetchSpy = mockServer(new Response('{"success":true,"id":"p1"}', { status: 200 }));
    await fillBasics();
    const chart = screen.getByRole('combobox', { name: 'Size chart' });
    expect(chart).toHaveValue('');
    expect(await screen.findByRole('option', { name: 'Hoodie' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /store default \(Oversized T-Shirt\)/i })).toBeInTheDocument();
    fireEvent.change(chart, { target: { value: 'hood' } });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => expect(saveCall(fetchSpy)).toBeTruthy());
    expect(JSON.parse(saveCall(fetchSpy)[1]!.body as string).size_chart_id).toBe('hood');
  });

  it('colour is optional: sizes alone create the price/stock rows', async () => {
    const fetchSpy = mockServer(new Response('{"success":true,"id":"p1"}', { status: 200 }));
    render(<ProductForm />);
    fireEvent.change(await screen.findByLabelText(/product name/i), { target: { value: 'Printed Tee' } });
    fireEvent.click(await screen.findByRole('button', { name: 'M' }));
    fireEvent.change(screen.getByLabelText('Selling price for M'), { target: { value: '799' } });
    fireEvent.change(screen.getByLabelText('Stock for M'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => expect(saveCall(fetchSpy)).toBeTruthy());
    expect(JSON.parse(saveCall(fetchSpy)[1]!.body as string).variants).toEqual([
      { color_id: null, size_option_id: 'm', price: 799, compare_at_price: null, stock: 5 },
    ]);
  });

  it('editing a product without colours shows its sizes and stock', async () => {
    render(<ProductForm productId="p1" initial={{
      name: 'Printed Tee', description: '', fabric: '', fit: '', pattern: '', sleeve_type: '', neck_type: '', gender: '',
      status: 'active', category_ids: [], collection_ids: [], images: [], size_chart_id: '',
      variants: [{ color_id: null, size_option_id: 'l', price: 799, compare_at_price: null, stock: 4 }],
    }} />);
    expect(await screen.findByLabelText('Stock for L')).toHaveValue(4);
  });

  it('shows the real error and stays on the page when saving fails', async () => {
    mockServer(new Response('{"error":"MRP must be higher than the selling price."}', { status: 400 }));
    await fillBasics();
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    expect(await screen.findByText('MRP must be higher than the selling price.')).toBeInTheDocument();
    expect(screen.queryByText(/published/i)).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
