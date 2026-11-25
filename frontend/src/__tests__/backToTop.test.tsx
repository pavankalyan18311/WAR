import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BackToTop from '@/components/ui/BackToTop';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const scrollTo = vi.fn();
beforeEach(() => {
  scrollTo.mockReset();
  vi.stubGlobal('scrollTo', scrollTo);
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

const scrollToY = (y: number) => act(() => { (window as any).scrollY = y; window.dispatchEvent(new Event('scroll')); });

describe('BackToTop', () => {
  it('appears only after scrolling about two screens', () => {
    render(<BackToTop />);
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
    scrollToY(1000);
    expect(screen.queryByRole('button', { name: /back to top/i })).not.toBeInTheDocument();
    scrollToY(1700);
    expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument();
  });

  it('scrolls back to the top', () => {
    render(<BackToTop />);
    scrollToY(2000);
    fireEvent.click(screen.getByRole('button', { name: /back to top/i }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});
