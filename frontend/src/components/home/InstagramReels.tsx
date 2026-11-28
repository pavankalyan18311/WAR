'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { instagramEmbedUrl, type Reel } from '@/lib/homeContent';
import InstagramEmbed from '@/components/home/InstagramEmbed';

const CARD = 'relative block shrink-0 w-[62%] sm:w-[calc((100%-4rem)/5)] aspect-[9/16] overflow-hidden snap-start transition-transform duration-300 ease-out';

const handleOf = (url: string | null) => url?.match(/instagram\.com\/([^/?#]+)/i)?.[1] ?? null;

/** Browsers only allow sound after the visitor has clicked/tapped/pressed a key on the page. */
function hasInteracted(fallback: boolean): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : fallback;
}

/**
 * Homepage reels: each video loads and plays muted on a loop only while it is on screen; grows slightly on hover.
 * Sound: hovering plays a reel with sound once the visitor has interacted with the page (before that, a
 * "Click for sound" hint shows); clicking a reel toggles its sound. "View ↗" opens it on Instagram.
 */
export default function InstagramReels({ reels, instagramUrl }: { reels: Reel[]; instagramUrl: string | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const interacted = useRef(false); // fallback for browsers without navigator.userActivation
  const [soundId, setSoundId] = useState<string | null>(null); // reel the visitor clicked for sound
  const [hintId, setHintId] = useState<string | null>(null);

  useEffect(() => {
    const mark = () => { interacted.current = true; };
    document.addEventListener('pointerdown', mark, { once: true });
    document.addEventListener('keydown', mark, { once: true });
    return () => {
      document.removeEventListener('pointerdown', mark);
      document.removeEventListener('keydown', mark);
    };
  }, []);

  /** Only `id` plays with sound; every other reel is muted. */
  const playWithSound = (id: string | null) => {
    videoRefs.current.forEach((v, key) => {
      v.muted = key !== id;
      if (key === id) v.play()?.catch(() => { v.muted = true; });
    });
  };
  const onEnter = (id: string) => {
    if (hasInteracted(interacted.current)) playWithSound(id);
    else setHintId(id);
  };
  const onLeave = () => {
    setHintId(null);
    playWithSound(soundId);
  };
  const toggleSound = (id: string) => {
    const next = soundId === id ? null : id;
    setSoundId(next);
    setHintId(null);
    playWithSound(next);
  };

  // Save data/battery: a reel's video only downloads once that reel is on screen (until then its poster
  // shows), plays while visible and pauses when scrolled away. On a phone that's 1–2 videos, not all of them.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        const v = target as HTMLVideoElement;
        if (isIntersecting) {
          if (!v.getAttribute('src') && v.dataset.src) v.setAttribute('src', v.dataset.src);
          v.play()?.catch(() => {});
        } else {
          v.pause();
        }
      }
    }, { threshold: 0.35 });
    el.querySelectorAll('video').forEach((v) => obs.observe(v));
    return () => obs.disconnect();
  }, [reels.length]);

  if (reels.length === 0) return null;
  const handle = handleOf(instagramUrl);
  const profile = instagramUrl ?? 'https://www.instagram.com/';

  return (
    <section ref={sectionRef} className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-20">
      <div className="flex items-end justify-between gap-6 pb-6 mb-8 border-b" style={{ borderColor: 'var(--border-strong)' }}>
        <div>
          <p className="eyebrow mb-3">02 — On Instagram{handle ? ` — @${handle}` : ''}</p>
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
          const on = soundId === r.id;
          return (
            <div key={r.id} data-reel onMouseEnter={() => onEnter(r.id)} onMouseLeave={onLeave}
              className={`group ${CARD} hover:scale-[1.04] hover:z-10 focus-within:scale-[1.04]`}
              style={{ background: 'var(--bg-elevated)', borderRadius: 14 }}>
              <video ref={(el) => { if (el) videoRefs.current.set(r.id, el); else videoRefs.current.delete(r.id); }}
                data-src={r.video_url ?? undefined} poster={r.poster_url ?? undefined} muted loop playsInline preload="none"
                className="absolute inset-0 w-full h-full object-cover" />
              <button type="button" aria-label={`Sound on: ${r.caption ?? 'reel'}`} aria-pressed={on}
                onClick={() => toggleSound(r.id)} className="absolute inset-0 w-full h-full cursor-pointer">
                {hintId === r.id && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold text-white px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    🔊 Click for sound
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 text-white p-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.45)' }} aria-hidden>
                  {on ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </span>
              </button>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pr-12 text-xs font-semibold text-white truncate"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                {r.caption ?? ''}
              </span>
              <a href={r.link_url ?? profile} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="absolute top-2.5 right-2.5 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                View ↗
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
