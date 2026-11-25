'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

interface ProductRailProps {
  title: string;
  eyebrow?: string;
  products: Product[];
  /** Max cards to show (default: all). */
  limit?: number;
}

/**
 * Horizontal, swipeable product row with scroll-snap.
 * ~2.2 cards visible on phones (hints there is more), 3 on tablets, 4 on desktop; arrows on desktop.
 */
export default function ProductRail({ title, eyebrow, products, limit }: ProductRailProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const shown = typeof limit === 'number' ? products.slice(0, limit) : products;

  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, shown.length]);

  const scroll = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.9), behavior: 'smooth' });
  };

  if (shown.length === 0) return null;

  const arrow = (dir: 1 | -1, atEdge: boolean) => (
    <button type="button" onClick={() => scroll(dir)} aria-label={dir === 1 ? `Next — ${title}` : `Previous — ${title}`}
      aria-disabled={atEdge}
      className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
      style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)', opacity: atEdge ? 0.35 : 1 }}>
      {dir === 1 ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
    </button>
  );

  return (
    <section className="mt-24">
      <div className="flex items-end justify-between gap-6 pb-5 mb-8 border-b" style={{ borderColor: 'var(--border-strong)' }}>
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="text-3xl sm:text-4xl">{title}</h2>
        </div>
        {shown.length > 2 && (
          <div className="hidden md:flex gap-2">
            {arrow(-1, edges.start)}
            {arrow(1, edges.end)}
          </div>
        )}
      </div>

      <ul ref={listRef} onScroll={updateEdges} aria-label={title}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-5 px-5 scroll-px-5 sm:mx-0 sm:px-0 sm:scroll-px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((p) => (
          <li key={p.product_id} className="snap-start shrink-0 basis-[44%] sm:basis-[calc((100%-3rem)/3)] lg:basis-[calc((100%-4.5rem)/4)]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
