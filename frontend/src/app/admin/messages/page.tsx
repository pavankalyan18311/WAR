'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  order_ref: string | null;
  message: string;
  status: 'new' | 'handled';
  created_at: string;
}

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<'new' | 'handled' | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load messages.');
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: Message['status']) => {
    setError('');
    const res = await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError('Could not update the message.');
      return;
    }
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  const shown = messages.filter((m) => filter === 'all' || m.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Questions sent through the Contact page</p>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      <div className="flex gap-1">
        {(['new', 'handled', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-2 rounded-lg text-xs font-medium capitalize"
            style={{ background: filter === f ? 'var(--primary)' : 'var(--bg-subtle)', color: filter === f ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>
            {f} ({messages.filter((m) => f === 'all' || m.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ ...card, color: 'var(--fg-muted)' }}>
          <Mail size={28} className="mx-auto mb-2 opacity-50" /> No messages here.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((m) => (
            <div key={m.id} className="rounded-2xl p-5" style={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {m.email}{m.phone && ` · ${m.phone}`}{m.order_ref && ` · Order ${m.order_ref}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => setStatus(m.id, m.status === 'new' ? 'handled' : 'new')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: m.status === 'new' ? 'var(--primary)' : 'var(--bg-subtle)', color: m.status === 'new' ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>
                    {m.status === 'new' ? <><CheckCircle2 size={12} /> Mark handled</> : 'Mark as new'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap">{m.message}</p>
              <a href={`mailto:${m.email}`} className="inline-block mt-3 text-xs font-semibold underline" style={{ color: 'var(--accent)' }}>Reply by email</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
