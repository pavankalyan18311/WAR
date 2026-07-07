'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy, Plus, Search, MessageSquare, Clock3, CheckCircle2, LoaderCircle } from 'lucide-react';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { INITIAL_TICKETS, type SupportTicket, type TicketStatus } from '@/lib/supportTickets';

const STATUS_META: Record<TicketStatus, { label: string; bg: string; fg: string; icon: React.ElementType }> = {
  open: { label: 'Open', bg: 'rgba(59,130,246,0.12)', fg: '#2563eb', icon: MessageSquare },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', fg: '#d97706', icon: LoaderCircle },
  resolved: { label: 'Resolved', bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', icon: CheckCircle2 },
};

const EMPTY_FORM = {
  subject: '',
  category: 'order' as SupportTicket['category'],
  message: '',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        ticket.id.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, query]);

  const handleCreate = () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    const now = new Date().toISOString();
    const nextId = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SupportTicket = {
      id: nextId,
      subject: form.subject.trim(),
      category: form.category,
      message: form.message.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    setTickets((prev) => [newTicket, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>
            Support Center
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--fg)' }}>Support Tickets</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                Create and track your support requests in one place.
              </p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              <Plus size={15} /> New Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        {showForm && (
          <ScrollReveal animation="fade-up">
            <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'var(--fg)' }}>
                Create Support Ticket
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Subject *</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="Briefly describe your issue"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as SupportTicket['category'] }))}
                    className="input-field cursor-pointer"
                  >
                    <option value="order">Order</option>
                    <option value="return">Return / Refund</option>
                    <option value="payment">Payment</option>
                    <option value="product">Product</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={4}
                  placeholder="Share details so we can help faster..."
                  className="input-field resize-none"
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2.5 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  Submit Ticket
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </section>
          </ScrollReveal>
        )}

        <section className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ticket ID or subject"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'open', label: 'Open' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'resolved', label: 'Resolved' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key as 'all' | TicketStatus)}
                  className="px-3 py-2 rounded-full text-xs font-semibold"
                  style={{
                    background: statusFilter === item.key ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: statusFilter === item.key ? 'var(--primary-fg)' : 'var(--fg-muted)',
                    border: `1px solid ${statusFilter === item.key ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-14 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <LifeBuoy size={28} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
              <p className="text-base font-bold" style={{ color: 'var(--fg)' }}>No tickets found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Try changing filters or create a new support ticket.</p>
            </div>
          )}

          {filtered.map((ticket, idx) => {
            const meta = STATUS_META[ticket.status];
            const Icon = meta.icon;
            return (
              <ScrollReveal key={ticket.id} animation="fade-up" delay={idx * 70}>
                <article className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-black tracking-[0.16em] uppercase" style={{ color: 'var(--fg-subtle)' }}>{ticket.id}</p>
                      <h3 className="text-base font-bold mt-1" style={{ color: 'var(--fg)' }}>{ticket.subject}</h3>
                      <p className="text-xs mt-1 capitalize" style={{ color: 'var(--fg-muted)' }}>
                        Category: {ticket.category.replace('_', ' ')}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit"
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      <Icon size={12} className={ticket.status === 'in_progress' ? 'animate-spin' : ''} />
                      {meta.label}
                    </span>
                  </div>

                  <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{ticket.message}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> Created: {formatDate(ticket.createdAt)}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> Updated: {formatDate(ticket.updatedAt)}</span>
                    <Link href={`/support/${ticket.id}`} className="inline-flex items-center gap-1.5 font-semibold hover:opacity-70"
                      style={{ color: 'var(--accent)' }}>
                      View Conversation →
                    </Link>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </main>
  );
}
