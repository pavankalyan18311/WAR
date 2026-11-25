'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Expand } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import ImageLightbox from '@/components/product/ImageLightbox';

type Img = { url: string; alt?: string };

/**
 * Product photos.
 * Desktop: thumbnails + main image with hover-zoom (magnifier follows the cursor); click opens the viewer.
 * Phones: swipeable slides with dot indicators; tap opens the viewer.
 */
export default function ProductGallery({ images, alt, badge }: { images: Img[]; alt: string; badge?: ReactNode }) {
  const [selected, setSelected] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const has = images.length > 0;
  const open = (i: number) => { if (has) setViewerAt(i); };

  const onZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!has) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const goToSlide = (i: number) => {
    const track = trackRef.current;
    track?.scrollTo?.({ left: i * track.clientWidth, behavior: 'smooth' });
    setSlide(i);
  };
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (track && track.clientWidth) setSlide(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden sm:flex gap-3">
        {images.length > 1 && (
          <div className="flex flex-col gap-2 w-20 flex-shrink-0">
            {images.map((img, i) => (
              <button key={i} type="button" data-testid={`pdp-thumb-${i}`} onClick={() => setSelected(i)} onMouseEnter={() => setSelected(i)}
                aria-label={`Show image ${i + 1}`}
                className="relative w-20 aspect-[4/5] flex-shrink-0 overflow-hidden transition-opacity"
                style={{ outline: selected === i ? '1px solid var(--fg)' : 'none', outlineOffset: 2, opacity: selected === i ? 1 : 0.55 }}>
                <Image src={img.url} alt={img.alt ?? alt} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}

        <div data-testid="pdp-main-image" role={has ? 'button' : undefined} tabIndex={has ? 0 : undefined}
          aria-label={has ? 'Open image viewer' : undefined}
          onClick={() => open(selected)} onKeyDown={(e) => e.key === 'Enter' && open(selected)}
          onMouseMove={onZoomMove} onMouseLeave={() => setZoom(null)}
          className={`group relative flex-1 aspect-[4/5] overflow-hidden ${has ? 'cursor-zoom-in' : ''}`} style={{ background: 'var(--bg-elevated)' }}>
          <ProductImage src={images[selected]?.url} alt={alt} sizes="(max-width: 768px) 100vw, 58vw" />
          {has && zoom && (
            <div aria-hidden className="absolute inset-0 pointer-events-none hidden [@media(hover:hover)]:block"
              style={{
                backgroundImage: `url("${images[selected].url}")`,
                backgroundSize: '220%',
                backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'var(--bg-elevated)',
              }} />
          )}
          {badge}
          {has && (
            <span className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)' }} aria-hidden>
              <Expand size={15} />
            </span>
          )}
        </div>
      </div>

      {/* Phones */}
      <div className="sm:hidden -mx-5">
        <div ref={trackRef} onScroll={onTrackScroll}
          className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(has ? images : [{ url: '' }]).map((img, i) => (
            <button key={i} type="button" onClick={() => open(i)} aria-label={has ? `Open image ${i + 1}` : undefined}
              className="relative w-full flex-shrink-0 snap-center aspect-[4/5]" style={{ background: 'var(--bg-elevated)' }}>
              <ProductImage src={img.url || null} alt={img.alt ?? alt} sizes="100vw" />
              {i === 0 && badge}
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-2 pt-3">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => goToSlide(i)} aria-label={`Go to image ${i + 1}`} aria-current={slide === i}
                className="h-[3px] transition-all" style={{ width: slide === i ? 22 : 10, background: slide === i ? 'var(--fg)' : 'var(--border-strong)' }} />
            ))}
          </div>
        )}
      </div>

      {viewerAt !== null && <ImageLightbox images={images} startIndex={viewerAt} alt={alt} onClose={() => setViewerAt(null)} />}
    </>
  );
}
