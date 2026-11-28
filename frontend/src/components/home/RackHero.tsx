'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type TouchEvent as ReactTouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RACK_TEES, getInitialIndex, nextIndex, prevIndex, type RackTee } from '@/lib/rackHero';
import { formatPrice } from '@/lib/utils';
import styles from './RackHero.module.css';

const AUTO_ADVANCE_MS = 4000;
/** Finger travel that counts as a swipe rather than a tap. */
const SWIPE_PX = 40;

type Side = 'front' | 'back';

const pad = (n: number) => String(n).padStart(2, '0');

/** Neighbours turn side-on toward the active tee; further ones turn a little more. */
const turnAngle = (offset: number) => (offset === 0 ? 0 : -Math.sign(offset) * (52 + Math.abs(offset) * 9));

/** Tilt the tees in the direction the cursor moves; they spring back once it stops. */
const settleTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
function brush(rack: HTMLElement, dx: number) {
  const push = Math.max(-7, Math.min(7, -dx * 0.6));
  rack.style.setProperty('--push', `${push}deg`);
  clearTimeout(settleTimers.get(rack));
  settleTimers.set(rack, setTimeout(() => rack.style.setProperty('--push', '0deg'), 120));
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Rack hero: tees hanging on a rail; the active one turns to face the visitor.
 * Click a tee to bring it forward; click it again to flip between front and back.
 * "Shop the drop" goes to the shop landing page.
 */
export default function RackHero({ tees = RACK_TEES, shopHref = '/shop' }: { tees?: RackTee[]; shopHref?: string }) {
  const [active, setActive] = useState(() => getInitialIndex(tees));
  const [side, setSide] = useState<Side>('front');
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Touch taps fire a synthetic mouseenter before click; ignore it so a tap on a side tee only selects it.
  const lastPointer = useRef<string>('mouse');
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (paused || reduced || tees.length <= 1) return;
    const id = setTimeout(() => {
      setActive((i) => nextIndex(i, tees.length));
      setSide('front');
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [active, paused, reduced, tees.length]);

  if (tees.length === 0) return null;

  const select = (i: number) => {
    if (i === active) return;
    setActive(i);
    setSide('front');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = e.key === 'ArrowRight' ? nextIndex(active, tees.length) : prevIndex(active, tees.length);
    select(i);
    buttons.current[i]?.focus();
  };

  // Phones: swipe left / right to move along the rack (a short movement stays a tap, which flips the tee).
  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    select(dx < 0 ? nextIndex(active, tees.length) : prevIndex(active, tees.length));
  };

  const tee = tees[active];

  return (
    <section className={styles.hero} aria-label="New drop">
      <div className={styles.topbar} data-testid="rack-topbar">
        <span>Drop 01 — Oversized</span>
        <span aria-hidden>{pad(active + 1)} / {pad(tees.length)}</span>
      </div>

      <div
        role="group"
        aria-label="Tees on the rack"
        className={styles.rack}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
        onPointerMove={(e) => {
          lastPointer.current = e.pointerType;
          if (!reduced && e.pointerType === 'mouse') brush(e.currentTarget, e.movementX);
        }}
      >
        <div className={styles.rail} aria-hidden />
        <ul className={styles.row}>
          {tees.map((t, i) => {
            const offset = i - active;
            const isActive = offset === 0;
            return (
              <li
                key={t.id}
                className={styles.slot}
                data-active={isActive}
                style={{ '--turn': `${turnAngle(offset)}deg`, '--depth': Math.abs(offset), '--i': i } as CSSProperties}
              >
                <button
                  ref={(el) => { buttons.current[i] = el; }}
                  type="button"
                  className={styles.tee}
                  aria-label={`${t.name}, ${formatPrice(t.price)}`}
                  aria-pressed={isActive}
                  data-side={isActive ? side : 'front'}
                  tabIndex={isActive ? 0 : -1}
                  onMouseEnter={() => {
                    if (lastPointer.current !== 'touch' && !isActive) select(i);
                  }}
                  onClick={() => {
                    if (!isActive) select(i);
                    else if (t.back) setSide((s) => (s === 'front' ? 'back' : 'front'));
                  }}
                >
                  <span className={styles.push}>
                  <span className={styles.swing}>
                    <span className={styles.turn}>
                      <span className={styles.flipper}>
                        <Image
                          className={styles.face}
                          src={t.front}
                          alt={`${t.name} — front`}
                          fill
                          sizes="(max-width: 768px) 60vw, 26vw"
                          priority={t.featured}
                        />
                        {t.back && (
                          <Image
                            className={`${styles.face} ${styles.back}`}
                            src={t.back}
                            alt={`${t.name} — back`}
                            fill
                            sizes="(max-width: 768px) 60vw, 26vw"
                          />
                        )}
                      </span>
                      {/* Hook drawn over the photo so it visibly hangs from the rail. */}
                      <svg className={styles.hanger} viewBox="0 0 40 56" aria-hidden>
                        <path d="M14 9a6 6 0 1 1 6 6v14" />
                        <path d="M6 36 20 29l14 7" />
                      </svg>
                    </span>
                  </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.footer}>
        <div data-testid="rack-caption" aria-live="polite" className={styles.caption} key={tee.id}>
          <p className={styles.name}>{tee.name}</p>
        </div>

        <p className={styles.hint}>Swipe · Tap the tee to flip</p>

        <div className={styles.progress} aria-hidden>
          <span key={`${tee.id}-${paused}`} data-running={!paused && !reduced && tees.length > 1} />
        </div>

        <div className={styles.actions}>
          <Link href={shopHref} className={styles.pill} data-testid="hero-shop-cta">
            Shop the drop <ArrowRight size={12} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
