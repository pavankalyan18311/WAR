'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

const TOPICS = [
  { value: 'order', label: 'Order Issue' },
  { value: 'return', label: 'Return / Refund' },
  { value: 'product', label: 'Product Query' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'other', label: 'Other' },
];

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>
      {children}
    </label>
  );
}

export default function ContactPage() {
  const EMPTY = { name: '', email: '', phone: '', order_ref: '', subject: '', message: '', website: '' };
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send your message. Please try again.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only details that have been filled in (siteConfig) are shown — never placeholders.
  const CONTACT_INFO = [
    { label: 'Email', value: siteConfig.supportEmail, href: `mailto:${siteConfig.supportEmail}` },
    { label: 'Phone', value: siteConfig.supportPhone, href: `tel:${siteConfig.supportPhone.replace(/\s/g, '')}` },
    { label: 'Address', value: siteConfig.address, href: undefined },
    { label: 'Support hours', value: siteConfig.supportHours, href: undefined },
  ].filter((c) => c.value);

  return (
    <main className="ui-page w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">
        {/* Header */}
        <header className="ui-card px-5 sm:px-8 py-8 mb-6">
          <span className="ui-chip ui-chip-brand mb-4">Get in touch</span>
          <h1 className="ui-heading leading-[1.02]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}>
            Contact <span style={{ color: 'var(--brand)' }}>us.</span>
          </h1>
          <p className="mt-3 text-[15px] max-w-lg" style={{ color: 'var(--fg-muted)' }}>
            Questions about an order, a size or a return? Write to us — we typically respond within 24 hours on business days.
          </p>
        </header>

        <div className="grid md:grid-cols-12 gap-6">
          {/* Details column */}
          <aside className="md:col-span-4 space-y-6 order-2 md:order-1">
            {CONTACT_INFO.length > 0 && (
              <dl className="ui-card px-5 py-5 space-y-4">
                {CONTACT_INFO.map(({ label, value, href }) => (
                  <div key={label}>
                    <dt className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-subtle)' }}>{label}</dt>
                    <dd className="text-[15px] font-semibold break-words" style={{ color: 'var(--fg)' }}>
                      {href ? <a href={href} className="ui-link">{value}</a> : value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="ui-card-soft px-5 py-5">
              <p className="ui-heading text-lg mb-2">Quick help</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg-muted)' }}>
                For tracking, returns and common questions, you may find an instant answer here.
              </p>
              <ul className="space-y-2">
                {[
                  { href: '/faq', label: 'Visit FAQ' },
                  { href: '/track-order', label: 'Track order' },
                  { href: '/refund-policy', label: 'Returns & refunds' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:text-[var(--brand)]"
                      style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
                      {l.label} <ArrowRight size={15} style={{ color: 'var(--brand)' }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Form */}
          <section className="md:col-span-8 order-1 md:order-2">
            {submitted ? (
              <div className="ui-card px-6 py-12 sm:p-14 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                  <CheckCircle size={30} />
                </div>
                <h2 className="ui-heading text-3xl mb-3">Message sent.</h2>
                <p className="text-[15px] mb-8 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
                  We&apos;ve received your message and will get back to you within 24 hours.
                </p>
                <button onClick={() => { setSubmitted(false); setForm(EMPTY); }} className="ui-btn-ghost">Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="ui-card px-5 sm:px-8 py-7 space-y-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="ui-heading text-2xl">Send a message</h2>
                  <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>* required</span>
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium px-4 py-3 rounded-xl" style={{ color: 'var(--bad)', background: 'var(--bad-soft)' }}>
                    {error}
                  </p>
                )}
                {/* Hidden from people; bots that fill it are ignored */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"
                  value={form.website} onChange={set('website')} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="c-name">Name *</Label>
                    <input id="c-name" required autoComplete="name" value={form.name} onChange={set('name')} placeholder="Your full name" className="ui-input" />
                  </div>
                  <div>
                    <Label htmlFor="c-email">Email *</Label>
                    <input id="c-email" required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className="ui-input" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="c-phone">Phone</Label>
                    <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" className="ui-input" />
                  </div>
                  <div>
                    <Label htmlFor="c-subject">Subject *</Label>
                    <select id="c-subject" required value={form.subject} onChange={set('subject')} className="ui-input cursor-pointer">
                      <option value="">Select a topic</option>
                      {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="c-ref">Order reference (if about an order)</Label>
                  <input id="c-ref" value={form.order_ref} onChange={set('order_ref')} placeholder="WAR-1A2B3C4D" className="ui-input" />
                </div>

                <div>
                  <Label htmlFor="c-message">Message *</Label>
                  <textarea id="c-message" required value={form.message} onChange={set('message')}
                    placeholder="Describe your issue or question in detail…" rows={6} className="ui-input resize-none" />
                </div>

                <button type="submit" disabled={loading} className="ui-btn w-full sm:w-auto !px-10 disabled:opacity-60">
                  {loading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <>Send Message <ArrowRight size={15} /></>}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
