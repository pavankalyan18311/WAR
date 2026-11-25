'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** Full-screen image viewer. Portalled to <body> so it sits above the sticky header. Esc / ← / → supported. */
export default function ImageLightbox({ images, startIndex, alt, onClose }: {
  images: { url: string; alt?: string }[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const count = images.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  if (typeof document === 'undefined' || count === 0) return null;
  const current = images[index];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Image viewer"
      className="fixed inset-0 z-[210] flex flex-col animate-fade-in" style={{ background: 'rgba(18,16,14,0.96)', color: '#F5F2EC' }}>
      <div className="flex items-center justify-between px-5 py-4 text-[11px] uppercase tracking-[0.2em]">
        <span aria-live="polite">{index + 1} / {count}</span>
        <button type="button" onClick={onClose} aria-label="Close image viewer" className="p-2 -m-2"><X size={22} /></button>
      </div>

      <div className="relative flex-1 min-h-0" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="absolute inset-0 m-auto max-w-5xl">
          <Image src={current.url} alt={current.alt ?? `${alt} — image ${index + 1}`} fill className="object-contain" sizes="100vw" priority />
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center border border-[rgba(245,242,236,0.35)] hover:bg-[rgba(245,242,236,0.12)]">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center border border-[rgba(245,242,236,0.35)] hover:bg-[rgba(245,242,236,0.12)]">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 px-5 py-4 overflow-x-auto" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`View image ${i + 1}`} aria-current={i === index}
              className="relative w-12 h-16 flex-shrink-0 overflow-hidden transition-opacity"
              style={{ opacity: i === index ? 1 : 0.45, outline: i === index ? '1px solid #F5F2EC' : 'none', outlineOffset: 2 }}>
              <Image src={img.url} alt="" fill className="object-cover" sizes="48px" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
