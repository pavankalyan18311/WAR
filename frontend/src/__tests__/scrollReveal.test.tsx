import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import ScrollReveal from '@/components/ui/ScrollReveal';

let reduced = false;
let trigger: ((entries: any[]) => void) | null = null;
const disconnect = vi.fn();

beforeEach(() => {
  reduced = false; trigger = null; disconnect.mockReset();
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') && reduced, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: any) { trigger = cb; }
    observe() {}
    disconnect() { disconnect(); }
  });
});

describe('ScrollReveal', () => {
  it('starts slightly lowered and transparent, then rises 12px into place once in view', () => {
    render(<ScrollReveal><p>Section</p></ScrollReveal>);
    const box = screen.getByText('Section').parentElement!;
    expect(box.style.opacity).toBe('0');
    expect(box.style.transform).toBe('translateY(12px)');
    act(() => trigger!([{ isIntersecting: true }]));
    expect(box.style.opacity).toBe('1');
    expect(disconnect).toHaveBeenCalled(); // reveals once
  });

  it('shows content immediately for reduced-motion users', () => {
    reduced = true;
    render(<ScrollReveal><p>Section</p></ScrollReveal>);
    expect(screen.getByText('Section').parentElement!.style.opacity).toBe('1');
  });
});
