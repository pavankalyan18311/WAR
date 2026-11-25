'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

/** Square ink "back to top" button, shown after ~2 screens of scrolling (storefront only). */
export default function BackToTop() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show || pathname?.startsWith('/admin')) return null;

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Sit above the WhatsApp button when it is shown (same corner).
  const bottom = siteConfig.whatsappNumber ? '5.25rem' : '1.5rem';

  return (
    <button type="button" aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
      className="fixed right-4 sm:right-6 z-40 w-11 h-11 flex items-center justify-center animate-fade-in transition-colors hover:bg-[var(--accent)]"
      style={{ bottom: `calc(${bottom} + env(safe-area-inset-bottom, 0px))`, background: 'var(--fg)', color: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
      <ArrowUp size={16} />
    </button>
  );
}
