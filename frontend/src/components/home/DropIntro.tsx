'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { DROP_INTRO, SLIDE_MS } from '@/lib/dropIntro';
import styles from './DropIntro.module.css';

const REDUCE = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
};
const getReduced = () => typeof window.matchMedia === 'function' && window.matchMedia(REDUCE).matches;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Opening of the shop page: a full-width slideshow of the Drop 01 shoot (true colour) behind
 * "DROP 01", with the current look's tee + slide markers along the bottom, then the six cut-out tees.
 * Entrance and parallax are written to the DOM (data-inview, --p) so scrolling never re-renders React.
 */
export default function DropIntro({ drop = DROP_INTRO }: { drop?: typeof DROP_INTRO }) {
  const ref = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => false);
  const count = drop.slides.length;
  const current = drop.slides[index];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => { el.dataset.inview = 'true'; });
    if (reduced) return () => cancelAnimationFrame(raf);
    // Parallax: the slideshow drifts slower than the page as you scroll away.
    const onScroll = () => el.style.setProperty('--p', Math.min(1, window.scrollY / (el.offsetHeight || 1)).toFixed(3));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, [reduced]);

  const autoplay = playing && !reduced && count > 1;
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [autoplay, index, count]);

  const [word, num] = drop.title.split(' ');

  return (
    <section ref={ref} className={styles.intro} aria-labelledby="drop-intro-title" data-inview="false">
      <div className={styles.show} role="region" aria-roledescription="carousel" aria-label="Drop 01 lookbook">
        {drop.slides.map((s, i) => (
          <div
            key={s.image}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className={styles.slide}
            data-active={i === index}
          >
            <Image src={s.image} alt={s.alt} fill priority={i === 0} sizes="100vw" className={styles.slideImg} style={{ objectPosition: s.focus }} />
          </div>
        ))}
      </div>

      <div className={styles.inner}>
        <p className={styles.eyebrow}><span className={styles.dot} aria-hidden /> {drop.eyebrow}</p>
        <h1 id="drop-intro-title" className={styles.title}>
          <span className={styles.word}>{word}</span>{' '}
          <span className={styles.num}>{num}</span>
        </h1>
        <p className={styles.tagline}>{drop.tagline}</p>
        <a href="#latest-drop" className={styles.cta}>
          {drop.ctaLabel} <ArrowDown size={15} aria-hidden />
        </a>

        <div className={styles.bar}>
          <div className={styles.now} aria-live="polite">
            <span className={styles.lookNo}>Look {pad(index + 1)} / {pad(count)}</span>
            <Link href={current.href} className={styles.lookLink} key={index} aria-label={`Shop ${current.tee}`}>
              {current.tee} <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
          <div className={styles.controls}>
            {drop.slides.map((s, i) => (
              <button
                key={s.image}
                type="button"
                className={styles.marker}
                aria-label={`Show look ${i + 1}`}
                aria-current={i === index}
                data-running={i === index && autoplay}
                onClick={() => setIndex(i)}
                style={{ '--slide-ms': `${SLIDE_MS}ms` } as CSSProperties}
              >
                <span />
              </button>
            ))}
            <button
              type="button"
              className={styles.playBtn}
              aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause size={12} aria-hidden /> : <Play size={12} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <ul className={styles.lineup} aria-label="The drop">
        {drop.tees.map((t, i) => (
          <li key={t.slug} style={{ '--i': i } as CSSProperties}>
            <Link href={t.href} className={styles.tee}>
              <span className={styles.teeImg}>
                <Image src={t.image} alt={`${t.name} — back print`} fill sizes="(max-width: 640px) 40vw, 16vw" />
              </span>
              <span className={styles.teeName}>{t.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
