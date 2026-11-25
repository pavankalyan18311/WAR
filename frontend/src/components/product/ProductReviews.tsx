'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  created_at: string;
  verified: boolean;
}
interface Summary {
  average: number;
  count: number;
  breakdown: Record<string, number>;
}
interface Mine {
  canReview: boolean;
  review: { rating: number; title: string | null; body: string; status: 'pending' | 'approved' | 'hidden' } | null;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} strokeWidth={1.5}
          style={{ color: 'var(--fg)', fill: n <= Math.round(value) ? 'var(--fg)' : 'transparent' }} />
      ))}
    </span>
  );
}

function ReviewForm({ productId, initial, onDone }: { productId: string; initial: Mine['review']; onDone: (msg: string) => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setError('Please choose a rating.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your review.');
      onDone(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="border p-6 sm:p-8 mb-10" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-card)' }}>
      <fieldset className="mb-5">
        <legend className="eyebrow mb-3">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)} className="p-1">
              <Star size={24} strokeWidth={1.4} style={{ color: 'var(--fg)', fill: n <= rating ? 'var(--fg)' : 'transparent' }} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block mb-4">
        <span className="eyebrow block mb-2">Title (optional)</span>
        <input className="input-field" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a few words" />
      </label>
      <label className="block mb-5">
        <span className="eyebrow block mb-2">Your review</span>
        <textarea className="input-field min-h-[120px]" maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Fit, fabric, how it washed — what should others know?" />
      </label>
      {error && <p role="alert" className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Submit review'}</button>
      <p className="text-xs mt-3" style={{ color: 'var(--fg-subtle)' }}>Reviews are checked before they appear. Your first name and last initial are shown.</p>
    </form>
  );
}

/** Reviews section on the product page (anchor #reviews). Opens the form when the URL has ?review=1. */
export default function ProductReviews({ productId, productSlug }: { productId: string; productSlug: string }) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<{ summary: Summary; reviews: Review[] } | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews`).then((r) => r.json()).then(setData).catch(() => setData({ summary: { average: 0, count: 0, breakdown: {} }, reviews: [] }));
  }, [productId]);

  useEffect(() => {
    if (!user) { setMine(null); return; }
    fetch(`/api/products/${productId}/reviews/me`).then((r) => r.json()).then((m: Mine) => {
      setMine(m);
      if (m.canReview && new URLSearchParams(window.location.search).get('review') === '1') setFormOpen(true);
    }).catch(() => setMine(null));
  }, [productId, user]);

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const loginHref = `/auth/login?redirect=${encodeURIComponent(`/products/${productSlug}?review=1#reviews`)}`;

  const action = (() => {
    if (notice) return <p className="text-sm" style={{ color: 'var(--success)' }}>{notice}</p>;
    if (!user) return <Link href={loginHref} className="btn-outline">Sign in to review</Link>;
    if (!mine) return null;
    if (mine.review) {
      return (
        <div className="flex items-center gap-4 flex-wrap">
          {mine.review.status === 'pending' && <span className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--warning)' }}>Your review is awaiting approval</span>}
          {mine.canReview && !formOpen && <button className="btn-outline" onClick={() => setFormOpen(true)}>Edit your review</button>}
        </div>
      );
    }
    if (mine.canReview) return !formOpen && <button className="btn-primary" onClick={() => setFormOpen(true)}>Write a review</button>;
    return <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>You can review this product once your order has been delivered.</p>;
  })();

  return (
    <section id="reviews" className="mt-24 scroll-mt-28">
      <div className="pb-5 mb-10 border-b flex items-end justify-between gap-6 flex-wrap" style={{ borderColor: 'var(--border-strong)' }}>
        <div>
          <p className="eyebrow mb-2">From our customers</p>
          <h2 className="text-3xl sm:text-4xl">Reviews</h2>
        </div>
        {action}
      </div>

      {formOpen && mine?.canReview && (
        <ReviewForm productId={productId} initial={mine.review}
          onDone={(msg) => { setFormOpen(false); setNotice(msg); setMine({ ...mine, review: null, canReview: false }); }} />
      )}

      {!data ? (
        <div className="h-24 skeleton" />
      ) : reviews.length === 0 ? (
        <p className="font-display text-xl" style={{ color: 'var(--fg-muted)' }}>No reviews yet — be the first to tell us how it fits.</p>
      ) : (
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl leading-none">{summary!.average.toFixed(1).replace(/\.0$/, '')}</span>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/ 5</span>
            </div>
            <div className="mt-3"><Stars value={summary!.average} size={16} /></div>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>{summary!.count} {summary!.count === 1 ? 'review' : 'reviews'}</p>
            <div className="mt-6 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = summary!.breakdown[n] ?? 0;
                return (
                  <div key={n} className="flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    <span className="w-3">{n}</span>
                    <span className="flex-1 h-[3px]" style={{ background: 'var(--border)' }}>
                      <span className="block h-full" style={{ width: `${summary!.count ? (c / summary!.count) * 100 : 0}%`, background: 'var(--fg)' }} />
                    </span>
                    <span className="w-6 text-right">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="md:col-span-8">
            {reviews.map((r) => (
              <li key={r.id} className="py-6 border-b first:pt-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-4">
                  <Stars value={r.rating} />
                  <time className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </time>
                </div>
                {r.title && <h3 className="text-xl mt-3">{r.title}</h3>}
                <p className="text-[15px] leading-relaxed mt-2" style={{ color: 'var(--fg-muted)' }}>{r.body}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] mt-3" style={{ color: 'var(--fg-subtle)' }}>
                  {r.author}{r.verified && <> · <span style={{ color: 'var(--success)' }}>Verified buyer</span></>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
