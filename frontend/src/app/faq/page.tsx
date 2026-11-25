'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Search } from 'lucide-react';
import ShippingNote from '@/components/ui/ShippingNote';
import { storePolicy as p } from '@/lib/storePolicy';

const FAQ_CATEGORIES = [
  {
    category: 'Orders & Payments',
    items: [
      { q: 'How do I track my order?', a: 'Go to My Account → My Orders, or use the Track Order page with your order reference (e.g. WAR-1A2B3C4D). The courier tracking number appears there once your order is dispatched.' },
      { q: 'Can I cancel my order?', a: 'Yes — any time before it is dispatched, from My Account → My Orders. You can cancel the whole order or individual items. Online payments are refunded automatically to your original payment method within ' + p.refundDays + '.' },
      { q: 'What payment methods do you accept?', a: 'UPI (Google Pay, PhonePe, Paytm and others), credit/debit cards, net banking and wallets through Razorpay, plus Cash on Delivery where available.' },
      { q: 'Is Cash on Delivery available?', a: 'Yes, on pincodes where our courier partner offers it. There is no extra charge for COD.' },
      { q: 'Are there any extra charges?', a: <>No. Prices include all taxes, and the only extra is shipping when your order is below the free-shipping amount. <ShippingNote variant="full" /></> },
    ],
  },
  {
    category: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'We dispatch within ' + p.dispatchDays + ', and delivery usually takes ' + p.deliveryDays + ' after dispatch. Check the estimate for your pincode on any product page.' },
      { q: 'Do you offer free shipping?', a: <>Yes! <ShippingNote variant="full" /></> },
      { q: 'Do you ship outside India?', a: 'Not yet — we currently ship only within India.' },
    ],
  },
  {
    category: 'Returns & Exchanges',
    items: [
      { q: 'What is your return policy?', a: 'You can return or exchange items within ' + p.returnDays + ' days of delivery, as long as they are unworn, unwashed and have their tags attached.' },
      { q: 'How do I return or exchange an item?', a: 'Send us a message through the Contact page with your order reference, the item and the reason. We will arrange a reverse pickup where available, or share the address to send it to.' },
      { q: 'Can I exchange for a different size?', a: 'Yes, size exchanges are available within ' + p.returnDays + ' days of delivery, subject to stock. If your size is not available we will refund you instead.' },
      { q: 'When will I get my refund?', a: 'Within ' + p.refundDays + ' after the returned item passes our quality check — to your original payment method, or to your UPI/bank account for Cash on Delivery orders.' },
      { q: 'I received a damaged or wrong item. What do I do?', a: 'Contact us within ' + p.damageReportHours + ' hours of delivery with photos of the item and packaging. We will send a free replacement or give you a full refund.' },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      { q: 'How do I find my size?', a: 'Tap "Size guide" on any product page to see that product\'s measurement chart (in inches or cm), or open our Size Guide page for every chart. Compare the measurements with a tee you already love.' },
      { q: 'Where can I see fabric details?', a: 'Each product page lists the fabric, fit and other details for that item.' },
      { q: 'Are the colours accurate in photos?', a: 'We try to show colours as accurately as possible, but screens vary, so the real colour may look slightly different.' },
    ],
  },
  {
    category: 'Account & Security',
    items: [
      { q: 'How do I create an account?', a: 'Click the person icon at the top, then Sign Up. Enter your details and verify your email with the code we send you.' },
      { q: 'I forgot my password. What do I do?', a: 'Click "Forgot Password" on the login page. We will email you a verification code to set a new password.' },
      { q: 'Is my payment information secure?', a: 'Yes. We never see or store your card details — payments are handled by Razorpay, a PCI DSS compliant payment gateway, and the whole site uses HTTPS.' },
    ],
  },
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        (typeof item.a === 'string' ? item.a : 'shipping').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(
    (cat) =>
      (activeCategory === 'All' || cat.category === activeCategory) &&
      cat.items.length > 0
  );

  const categories = ['All', ...FAQ_CATEGORIES.map((c) => c.category)];

  return (
    <main className="ui-page w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">
        {/* Header */}
        <header className="ui-card px-5 sm:px-8 py-8 mb-6 grid md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-7">
            <span className="ui-chip ui-chip-brand mb-4">Help centre</span>
            <h1 className="ui-heading leading-[1.02]" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.4rem)' }}>
              Frequently asked <span style={{ color: 'var(--brand)' }}>questions.</span>
            </h1>
            <p className="mt-3 text-[15px]" style={{ color: 'var(--fg-muted)' }}>
              Can&apos;t find what you need? <Link href="/contact" className="ui-link">Contact us</Link>
            </p>
          </div>
          {/* Search */}
          <div className="md:col-span-5">
            <label className="relative flex items-center">
              <Search size={17} className="absolute left-4 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…"
                aria-label="Search questions" className="ui-input !pl-11 !rounded-full" />
            </label>
          </div>
        </header>

        <div className="grid md:grid-cols-12 gap-6">
          {/* Topics */}
          <nav className="md:col-span-3" aria-label="FAQ topics">
            <ul className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:sticky md:top-32 [scrollbar-width:none]">
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <li key={cat} className="shrink-0">
                    <button onClick={() => setActiveCategory(cat)} aria-pressed={active}
                      className="w-full text-left text-sm font-semibold px-4 py-2.5 rounded-full md:rounded-xl transition-colors whitespace-nowrap border"
                      style={{
                        background: active ? 'var(--brand)' : 'var(--surface)',
                        color: active ? 'var(--brand-fg)' : 'var(--fg)',
                        borderColor: active ? 'var(--brand)' : 'var(--border)',
                      }}>
                      {cat}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Questions */}
          <div className="md:col-span-9">
            {filtered.length === 0 && (
              <div className="ui-card px-6 py-14 text-center">
                <p className="ui-heading text-2xl mb-2">No results found</p>
                <p className="text-[15px]" style={{ color: 'var(--fg-muted)' }}>
                  Try a different keyword or <Link href="/contact" className="ui-link">ask us directly</Link>
                </p>
              </div>
            )}

            <div className="space-y-8">
              {filtered.map((cat, ci) => (
                <section key={cat.category}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      {String(ci + 1).padStart(2, '0')}
                    </span>
                    <h2 className="ui-heading text-xl sm:text-2xl">{cat.category}</h2>
                  </div>
                  <div className="space-y-2.5">
                    {cat.items.map((item, i) => {
                      const key = `${cat.category}-${i}`;
                      const isOpen = openItem === key;
                      return (
                        <div key={key} className="ui-card overflow-hidden transition-shadow"
                          style={{ boxShadow: isOpen ? '0 0 0 2px var(--brand)' : undefined }}>
                          <button
                            onClick={() => setOpenItem(isOpen ? null : key)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 group"
                          >
                            <span className="text-[15px] font-semibold transition-colors group-hover:text-[var(--brand)]"
                              style={{ color: isOpen ? 'var(--brand)' : 'var(--fg)' }}>{item.q}</span>
                            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                              style={{ background: isOpen ? 'var(--brand)' : 'var(--surface-2)', color: isOpen ? 'var(--brand-fg)' : 'var(--fg)' }}>
                              {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 pr-6 sm:pr-14 text-[15px] leading-relaxed animate-fade-in" style={{ color: 'var(--fg-muted)' }}>
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
