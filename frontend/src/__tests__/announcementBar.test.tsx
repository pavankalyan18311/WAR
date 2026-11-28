import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AnnouncementBar from '@/components/layout/AnnouncementBar';

vi.mock('@/store/cartStore', () => ({
  useCartStore: (pick: (s: unknown) => unknown) => pick({ shippingSettings: { free_shipping_threshold: 1500, shipping_fee: 99, return_days: 9 } }),
}));

const visible = () => screen.getAllByRole('listitem').find((li) => li.getAttribute('aria-hidden') === 'false')!.textContent;
let reducedMotion = false;

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') && reducedMotion, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); // defaults unless a test says otherwise
});
afterEach(() => vi.useRealTimers());

describe('AnnouncementBar', () => {
  it('rotates between messages every few seconds', () => {
    render(<AnnouncementBar />);
    expect(visible()).toMatch(/free shipping/i);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(visible()).toMatch(/returns/i);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(visible()).toMatch(/cash on delivery/i);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(visible()).toMatch(/free shipping/i);
  });

  it('pauses while hovered', () => {
    render(<AnnouncementBar />);
    fireEvent.mouseEnter(screen.getByRole('region', { name: /announcements/i }));
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(visible()).toMatch(/free shipping/i);
  });

  it('stays still for people who prefer reduced motion', () => {
    reducedMotion = true;
    render(<AnnouncementBar />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(visible()).toMatch(/free shipping/i);
  });
});

describe('AnnouncementBar — messages from Admin → Homepage', () => {
  const serve = (body: unknown) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }));

  it('shows the store promises with the live free-shipping amount by default', () => {
    render(<AnnouncementBar />);
    expect(visible()).toBe('Free shipping on orders above ₹1,500');
  });

  it("shows the admin's messages, filling in {free_shipping} and {return_days}", async () => {
    serve({ enabled: true, items: ['Drop 02 is live', 'Free shipping over {free_shipping}', '{return_days}-day returns'] });
    render(<AnnouncementBar />);
    await act(async () => { await Promise.resolve(); });
    expect(visible()).toBe('Drop 02 is live');
    act(() => { vi.advanceTimersByTime(4500); });
    expect(visible()).toBe('Free shipping over ₹1,500');
    act(() => { vi.advanceTimersByTime(4500); });
    expect(visible()).toBe('9-day returns'); // the return window set in Admin → Settings
  });

  it('disappears when the admin switches it off', async () => {
    serve({ enabled: false, items: ['Hidden'] });
    render(<AnnouncementBar />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('region', { name: /announcements/i })).toBeNull();
  });
});
