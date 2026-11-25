'use client';

import { useEffect, useRef } from 'react';
import { instagramEmbedUrl, type Reel } from '@/lib/homeContent';
import InstagramEmbed from '@/components/home/InstagramEmbed';

const CARD = 'relative block shrink-0 w-[62%] sm:w-[calc((100%-4rem)/5)] aspect-[9/16] overflow-hidden snap-start transition-transform duration-300 ease-out';

const handleOf = (url: string | null) => url?.match(/instagram\.com\/([^/?#]+)/i)?.[1] ?? null;

/**
 * Homepage reels: every video plays muted on a loop while the section is on screen,
 * grows slightly on hover, and opens the reel (or the profile) on Instagram when clicked.
 */
export default function InstagramReels({ reels, instagramUrl }: { reels: Reel[]; instagramUrl: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);

  // Save battery/data: play while visible, pause when scrolled away.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const videos = () => Array.from(el.querySelectorAll('video'));
    const obs = new IntersectionObserver(([entry]) => {
      for (const v of videos()) {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [reels.length]);

  if (reels.length === 0) return null;
  const handle = handleOf(instagramUrl);
  const profile = instagramUrl ?? 'https://www.instagram.com/';

  return (
    <section ref={sectionRef} className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-20">
      <div className="flex items-end justify-between gap-6 pb-6 mb-8 border-b" style={{ borderColor: 'var(--border-strong)' }}>
        <div>
          <p className="eyebrow mb-3">On Instagram{handle ? ` — @${handle}` : ''}</p>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1 }}>Worn without regrets</h2>
        </div>
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
            className="link-rule text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap">
            Follow{handle ? ` @${handle}` : ' us'}
          </a>
        )}
      </div>

      {/* Each reel is always one fifth of the row (desktop); fewer than five sit centred, more scroll sideways. */}
      <div className={`flex gap-4 overflow-x-auto snap-x snap-mandatory py-3 -mx-5 px-5 sm:mx-0 sm:px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${reels.length < 5 ? 'sm:justify-center' : ''}`}>
        {reels.map((r) => {
          const label = `Watch on Instagram${r.caption ? `: ${r.caption}` : ''}`;
          const embed = r.video_url ? null : instagramEmbedUrl(r.link_url);
          if (embed) {
            // Added by link only: Instagram's own player (plays when tapped), cropped to the reel card.
            return (
              <div key={r.id} data-reel className={`${CARD} hover:scale-[1.04] hover:z-10`} style={{ background: '#000', borderRadius: 14 }}>
                <InstagramEmbed src={embed} title={`Instagram reel${r.caption ? `: ${r.caption}` : ''}`} />
                <a href={r.link_url!} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="absolute top-2.5 right-2.5 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.55)' }}>
                  View ↗
                </a>
              </div>
            );
          }
          return (
          <a key={r.id} data-reel href={r.link_url ?? profile} target="_blank" rel="noopener noreferrer"
            aria-label={label}
            className={`group ${CARD} hover:scale-[1.04] hover:z-10 focus-visible:scale-[1.04]`}
            style={{ background: 'var(--bg-elevated)', borderRadius: 14 }}>
            <video src={r.video_url ?? undefined} poster={r.poster_url ?? undefined} muted loop playsInline autoPlay preload="metadata"
              className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-xs font-semibold text-white flex items-center justify-between gap-2"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
              <span className="truncate">{r.caption ?? ''}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View ↗</span>
            </span>
          </a>
          );
        })}
      </div>
    </section>
  );
}
