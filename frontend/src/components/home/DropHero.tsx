'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { DROP_HERO } from '@/lib/dropHero';
import styles from './DropHero.module.css';

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Shop page hero spotlighting the current drop (the green Zoro tee).
 * Lines slide up and photos wipe in when it scrolls into view; photos drift at different speeds while scrolling.
 * Both are written to the DOM directly (data-inview, --p) so scrolling never re-renders React.
 */
export default function DropHero({ drop = DROP_HERO }: { drop?: typeof DROP_HERO }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = prefersReducedMotion();

    // Reveal once on screen (immediately where IntersectionObserver isn't available).
    let observer: IntersectionObserver | undefined;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      el.dataset.inview = 'true';
    } else {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { el.dataset.inview = 'true'; observer?.disconnect(); }
      }, { threshold: 0.2 });
      observer.observe(el);
    }
    if (reduced) return () => observer?.disconnect();

    // Parallax: --p goes from -0.5 (section entering) to 0.5 (leaving).
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = (vh - r.top) / (vh + r.height || 1) - 0.5;
      el.style.setProperty('--p', Math.max(-0.5, Math.min(0.5, p)).toFixed(3));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); observer?.disconnect(); };
  }, []);

  return (
    <section ref={ref} className={styles.hero} aria-labelledby="drop-hero-title" data-inview="false">
      <span className={styles.ghost} aria-hidden>ASURA&nbsp;ASURA&nbsp;ASURA</span>

      <div className={styles.grid}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span className={styles.dot} aria-hidden /> Spotlight — {drop.eyebrow}</p>

          <h2 id="drop-hero-title" className={styles.title}>
            <span className={styles.line}><span className={styles.kicker}>{drop.kicker}</span></span>
            <span className={styles.line}><span className={styles.name}>{drop.name}</span></span>
          </h2>

          <p className={styles.text}>{drop.copy}</p>

          <div className={styles.actions}>
            <Link href={drop.ctaHref} className={styles.cta}>
              {drop.ctaLabel} <ArrowRight size={15} aria-hidden />
            </Link>
            <a href="#latest-drop" className={styles.explore}>
              Explore the drop <ArrowDown size={14} aria-hidden />
            </a>
          </div>
        </div>

        <div className={styles.collage}>
          <span className={styles.kanji} aria-hidden>大剣</span>
          <figure className={`${styles.shot} ${styles.main}`}>
            <Image src={drop.images.main} alt={`${drop.name} — back print, from above`} fill priority sizes="(max-width: 900px) 70vw, 34vw" />
          </figure>
          <figure className={`${styles.shot} ${styles.back}`}>
            <Image src={drop.images.front} alt={`${drop.name} — front, with sword`} fill sizes="(max-width: 900px) 50vw, 24vw" />
          </figure>
          <figure className={`${styles.shot} ${styles.close}`}>
            <Image src={drop.images.back} alt={`${drop.name} — back, with sword`} fill sizes="(max-width: 900px) 40vw, 18vw" />
          </figure>
        </div>
      </div>
    </section>
  );
}
