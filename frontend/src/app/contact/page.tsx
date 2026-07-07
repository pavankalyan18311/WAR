'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const CONTACT_INFO = [
    { icon: Mail, label: 'Email', value: 'support@threadx.in', href: 'mailto:support@threadx.in' },
    { icon: Phone, label: 'Phone', value: '+91 80 4567 8901', href: 'tel:+918045678901' },
    { icon: MapPin, label: 'Address', value: '42 Koramangala Industrial Layout, Bengaluru - 560095', href: undefined },
    { icon: Clock, label: 'Support Hours', value: 'Mon–Sat, 9 AM – 7 PM IST', href: undefined },
  ];

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
          <ScrollReveal animation="fade-up">
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Get In Touch</p>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>Contact Us</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              We typically respond within 24 hours on business days.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact info */}
          <ScrollReveal animation="fade-right">
            <div className="space-y-5">
              {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <Icon size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                    {href ? (
                      <a href={href} className="text-sm font-semibold hover:underline" style={{ color: 'var(--fg)' }}>{value}</a>
                    ) : (
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-xl p-5 mt-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--fg)' }}>Quick Help</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--fg-muted)' }}>
                  For order tracking, returns, and common questions, check our FAQ page first — you might find an instant answer.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href="/faq"
                    className="inline-block text-xs font-bold px-4 py-2 rounded-full transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    Visit FAQ →
                  </a>
                  <a href="/support"
                    className="inline-block text-xs font-bold px-4 py-2 rounded-full transition-all hover:opacity-90"
                    style={{ background: 'var(--bg-card)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                    Raise Ticket
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Form */}
          <ScrollReveal animation="fade-left">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center rounded-2xl p-8"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <CheckCircle size={32} style={{ color: '#22c55e' }} />
                </div>
                <h2 className="text-xl font-black mb-2" style={{ color: 'var(--fg)' }}>Message Sent!</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                  We've received your message and will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                  className="px-6 py-2.5 rounded-full font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl p-6 sm:p-8"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h2 className="text-lg font-black mb-2" style={{ color: 'var(--fg)' }}>Send a Message</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Name *</label>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Email *</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="input-field" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Subject *</label>
                    <select required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className="input-field cursor-pointer">
                      <option value="">Select a topic</option>
                      <option value="order">Order Issue</option>
                      <option value="return">Return / Refund</option>
                      <option value="product">Product Query</option>
                      <option value="payment">Payment Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Message *</label>
                  <textarea required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail…"
                    rows={5}
                    className="input-field resize-none" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
                  ) : (
                    <><Send size={15} /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
