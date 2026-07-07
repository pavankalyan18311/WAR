'use client';

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Send, MessageSquare, CheckCircle2, LoaderCircle } from 'lucide-react';
import { INITIAL_REPLIES, INITIAL_TICKETS } from '@/lib/supportTickets';

const STATUS_META = {
  open: { label: 'Open', bg: 'rgba(59,130,246,0.12)', fg: '#2563eb', icon: MessageSquare },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', fg: '#d97706', icon: LoaderCircle },
  resolved: { label: 'Resolved', bg: 'rgba(34,197,94,0.12)', fg: '#16a34a', icon: CheckCircle2 },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ticket = INITIAL_TICKETS.find((t) => t.id.toLowerCase() === id.toLowerCase());

  const [replies, setReplies] = useState(INITIAL_REPLIES.filter((r) => r.ticketId.toLowerCase() === id.toLowerCase()));
  const [message, setMessage] = useState('');

  const sortedReplies = useMemo(
    () => [...replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [replies]
  );

  if (!ticket) notFound();

  const meta = STATUS_META[ticket.status];
  const Icon = meta.icon;

  const submitReply = () => {
    const text = message.trim();
    if (!text) return;
    setReplies((prev) => [
      ...prev,
      {
        id: `r-${Date.now()}`,
        ticketId: ticket.id,
        author: 'customer',
        message: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setMessage('');
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
          <Link href="/support" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={14} /> Back to Tickets
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] uppercase" style={{ color: 'var(--fg-subtle)' }}>{ticket.id}</p>
              <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--fg)' }}>{ticket.subject}</h1>
              <p className="text-sm mt-1 capitalize" style={{ color: 'var(--fg-muted)' }}>Category: {ticket.category.replace('_', ' ')}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit"
              style={{ background: meta.bg, color: meta.fg }}>
              <Icon size={12} className={ticket.status === 'in_progress' ? 'animate-spin' : ''} />
              {meta.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <section className="rounded-2xl p-5 sm:p-6 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>Original Message</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{ticket.message}</p>
          <div className="mt-3 text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
            <Clock3 size={12} /> Created {formatDate(ticket.createdAt)}
          </div>
        </section>

        <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-black tracking-widest uppercase mb-4" style={{ color: 'var(--fg-muted)' }}>Conversation</p>

          <div className="space-y-3">
            {sortedReplies.map((reply) => (
              <div key={reply.id}
                className="rounded-xl p-3.5"
                style={{
                  background: reply.author === 'support' ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--bg-elevated)',
                  border: `1px solid ${reply.author === 'support' ? 'color-mix(in srgb, var(--primary) 35%, var(--border))' : 'var(--border)'}`,
                }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: reply.author === 'support' ? 'var(--primary)' : 'var(--fg-muted)' }}>
                    {reply.author === 'support' ? 'Support Team' : 'You'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{formatDate(reply.createdAt)}</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>{reply.message}</p>
              </div>
            ))}
          </div>

          {ticket.status !== 'resolved' ? (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Add Reply</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Share an update or ask a follow-up question..."
                className="input-field resize-none"
              />
              <button
                type="button"
                onClick={submitReply}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                <Send size={14} /> Send Reply
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold" style={{ color: '#16a34a' }}>
              This ticket is resolved. Create a new ticket if you need more help.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
