'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

interface Group {
  variant_id: string;
  product: string;
  slug: string | null;
  size: string | null;
  color: string | null;
  count: number;
  latest: string;
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };

/** Read-only: which sold-out sizes customers are waiting for. Restocking a size emails them automatically. */
export default function AdminStockAlertsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stock-alerts')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load back-in-stock requests.');
        setGroups(data.groups ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = groups.reduce((n, g) => n + g.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Back in stock</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Customers who asked to be told when a sold-out size returns. When you add stock to that size (Products → Edit), they&apos;re emailed automatically.
        </p>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      ) : !error && groups.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ ...card, color: 'var(--fg-muted)' }}>
          <Bell size={28} className="mx-auto mb-2 opacity-50" /> No one is waiting for a restock right now.
        </div>
      ) : groups.length > 0 && (
        <div className="rounded-2xl overflow-x-auto" style={card}>
          <p className="px-5 pt-4 text-sm font-semibold">{total} customers waiting across {groups.length} sizes</p>
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs" style={{ color: 'var(--fg-muted)' }}>
                <th className="px-5 py-2 font-semibold">Product</th>
                <th className="px-5 py-2 font-semibold">Size / colour</th>
                <th className="px-5 py-2 font-semibold text-right">Waiting</th>
                <th className="px-5 py-2 font-semibold">Latest request</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.variant_id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-5 py-3 font-semibold">
                    {g.slug ? <Link href={`/products/${g.slug}`} target="_blank" className="hover:underline">{g.product}</Link> : g.product}
                  </td>
                  <td className="px-5 py-3">{[g.size, g.color].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold">{g.count}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--fg-muted)' }}>
                    {new Date(g.latest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
