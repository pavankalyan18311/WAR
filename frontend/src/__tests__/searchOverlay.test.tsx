import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchOverlay from '@/components/layout/SearchOverlay';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const results = [
  { id: '1', name: 'Shadow Oversized Tee', slug: 'shadow', image: '', price: 999, compare_at_price: 1299, category: 'Oversized' },
  { id: '2', name: 'Oversized Graphic Tee', slug: 'graphic', image: '', price: 1499, compare_at_price: null, category: 'T-Shirts' },
];
const fetchMock = vi.fn();
const onClose = vi.fn();

function setup() {
  render(<SearchOverlay open onClose={onClose} categories={[{ id: 'c1', name: 'Oversized' }]} />);
  return screen.getByTestId('header-search-input');
}
const type = async (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
};

beforeEach(() => {
  vi.useFakeTimers();
  push.mockReset(); onClose.mockReset(); fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results }) });
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('SearchOverlay (predictive search)', () => {
  it('waits for the customer to pause typing, then shows matching products', async () => {
    const input = setup();
    fireEvent.change(input, { target: { value: 'ove' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'over' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/search?q=over');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('Shadow Oversized Tee')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all results for .over./i })).toHaveAttribute('href', '/products?search=over');
  });

  it('suggestions show product picture, name and category only — no prices', async () => {
    const input = setup();
    await type(input, 'over');
    const list = screen.getByRole('listbox');
    expect(list).toHaveTextContent('Shadow Oversized Tee');
    expect(list).toHaveTextContent('Oversized');
    expect(list.textContent).not.toMatch(/₹|999|1,299|1,499/);
  });

  it('does not search for a single character', async () => {
    const input = setup();
    await type(input, 'o');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('arrow keys move through results and Enter opens the highlighted product', async () => {
    const input = setup();
    await type(input, 'over');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/products/graphic');
    expect(onClose).toHaveBeenCalled();
  });

  it('Enter without a highlighted product searches all products (and remembers the search)', async () => {
    const input = setup();
    await type(input, 'black tee');
    fireEvent.submit(input.closest('form')!);
    expect(push).toHaveBeenCalledWith('/products?search=black%20tee');
    expect(JSON.parse(localStorage.getItem('war-recent-searches')!)).toEqual(['black tee']);
  });

  it('shows recent searches and categories before typing', () => {
    localStorage.setItem('war-recent-searches', JSON.stringify(['oversized', 'black']));
    setup();
    expect(screen.getByRole('button', { name: 'oversized' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oversized' })).toBeInTheDocument();
  });

  it('shows a helpful message when nothing matches', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const input = setup();
    await type(input, 'zzzz');
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it('Escape closes', () => {
    const input = setup();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
