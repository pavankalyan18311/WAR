import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AnnouncementBar from '@/components/layout/AnnouncementBar';

vi.mock('@/components/ui/ShippingNote', () => ({ default: () => <span>Free shipping on orders above ₹1,500</span> }));

const visible = () => screen.getAllByRole('listitem').find((li) => li.getAttribute('aria-hidden') === 'false')!.textContent;
let reducedMotion = false;

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') && reducedMotion, addEventListener() {}, removeEventListener() {} }));
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
