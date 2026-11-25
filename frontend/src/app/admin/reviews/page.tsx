'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Check, EyeOff, Trash2 } from 'lucide-react';

type Status = 'pending' | 'approved' | 'hidden';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: Status;
  created_at: string;
  product: { name: string; slug: string } | null;
  profile: { name: string | null; email: string | null } | null;
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'approved', label: 'Live' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'all', label: 'All' },
];

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async (f: Status | 'all') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/reviews?status=${f}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load reviews.');
      setReviews(data.reviews);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  const setStatus = async (id: string, status: Status) => {
    setError('');
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { setError('Could not update the review.'); return; }
    setReviews((list) => (filter === 'all' ? list.map((r) => (r.id === id ? { ...r, status } : r)) : list.filter((r) => r.id !== id)));
  };

  const remove = async (id: string) => {
    setConfirmDelete(null);
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Could not delete the review.'); return; }
    setReviews((list) => list.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Customer reviews appear on the product page only after you approve them. Only customers whose order was delivered can write one.
        </p>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className="px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: filter === f.key ? 'var(--primary)' : 'var(--bg-subtle)', color: filter === f.key ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ ...card, color: 'var(--fg-muted)' }}>
          <Star size={28} className="mx-auto mb-2 opacity-50" /> No reviews here.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl p-5" style={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {r.product ? (
                    <Link href={`/products/${r.product.slug}#reviews`} target="_blank" className="font-semibold hover:underline">{r.product.name}</Link>
                  ) : <span className="font-semibold">Deleted product</span>}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {r.profile?.name || 'Customer'}{r.profile?.email && ` · ${r.profile.email}`} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="inline-flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} style={{ color: '#d97706', fill: n <= r.rating ? '#d97706' : 'transparent' }} />
                  ))}
                </span>
              </div>
              {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm whitespace-pre-wrap">{r.body}</p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {filter === 'all' && <span className="text-xs capitalize mr-2" style={{ color: 'var(--fg-muted)' }}>Status: {r.status}</span>}
                {r.status !== 'approved' && (
                  <button onClick={() => setStatus(r.id, 'approved')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    <Check size={12} /> Approve
                  </button>
                )}
                {r.status !== 'hidden' && (
                  <button onClick={() => setStatus(r.id, 'hidden')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                    <EyeOff size={12} /> Hide
                  </button>
                )}
                {confirmDelete === r.id ? (
                  <span className="inline-flex items-center gap-2 text-xs">
                    Delete permanently?
                    <button onClick={() => remove(r.id)} className="font-semibold" style={{ color: '#ef4444' }}>Yes, delete</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ color: 'var(--fg-muted)' }}>Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDelete(r.id)} aria-label="Delete review" className="inline-flex items-center gap-1 px-2 py-1.5 text-xs"
                    style={{ color: 'var(--fg-muted)' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
