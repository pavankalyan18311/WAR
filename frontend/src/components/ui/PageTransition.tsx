'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Trigger re-animation on route change
    el.style.animation = 'none';
    // Force reflow
    void el.offsetHeight;
    el.style.animation = '';
  }, [pathname]);

  return (
    <div
      ref={ref}
      className="animate-page-enter flex-1 flex flex-col w-full"
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </div>
  );
}
