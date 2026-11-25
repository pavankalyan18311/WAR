'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Phones only: once the main "Add to cart" button scrolls out of view, a slim bar keeps
 * the product, price, size and the main action within thumb reach.
 */
export default function StickyBuyBar({ targetRef, name, price, selectedSize, actionLabel, actionDisabled, onAction, onChooseSize }: {
  targetRef: RefObject<HTMLElement | null>;
  name: string;
  price: string;
  selectedSize: string | null;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  onChooseSize: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (!visible) return null;

  // Portal: the page wrapper animates with a transform, which would pin a fixed bar to the page instead of the screen.
  return createPortal(
    <div data-testid="sticky-buy-bar"
      className="md:hidden fixed inset-x-0 bottom-0 z-[90] border-t animate-fade-up"
      style={{ background: 'var(--bg)', borderColor: 'var(--border-strong)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] truncate">{name}</p>
          <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
            {price}{selectedSize && <> · Size {selectedSize}</>}
          </p>
        </div>
        {selectedSize ? (
          <button type="button" onClick={onAction} disabled={actionDisabled} className="btn-primary !py-3 !px-5 whitespace-nowrap">
            {actionLabel}
          </button>
        ) : (
          <button type="button" onClick={onChooseSize} className="btn-outline !py-3 !px-5 whitespace-nowrap">Select size</button>
        )}
      </div>
    </div>,
    document.body,
  );
}
