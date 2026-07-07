'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import ScrollReveal from '@/components/ui/ScrollReveal';

const FAQ_CATEGORIES = [
  {
    category: 'Orders & Payments',
    items: [
      { q: 'How do I track my order?', a: 'Once your order ships, you\'ll get an SMS and email with a tracking link. You can also use our Track Order page at /track-order or go to My Account → My Orders for full status history.' },
      { q: 'Can I change or cancel my order?', a: 'Orders can be modified or cancelled within 1 hour of placement. After that, the order goes into processing. Contact us immediately at support@threadx.in.' },
      { q: 'What payment methods do you accept?', a: 'We accept UPI (PhonePe, GPay, Paytm), credit/debit cards (Visa, Mastercard, RuPay), net banking, and Cash on Delivery (COD) for orders up to ₹5,000.' },
      { q: 'Is COD available?', a: 'Yes, Cash on Delivery is available for orders up to ₹5,000 across most pin codes in India. COD is not available for some remote areas.' },
    ],
  },
  {
    category: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Metro cities: 2–4 business days. Tier 2/3 cities: 4–6 business days. Remote areas: 6–10 business days. All timelines are post-dispatch.' },
      { q: 'Do you offer free shipping?', a: 'Yes! Free shipping on all orders above ₹999. Orders below ₹999 have a flat ₹79 shipping fee.' },
      { q: 'Do you ship outside India?', a: 'Currently we ship only within India. International shipping is coming soon.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer a no-questions-asked 7-day return policy from the date of delivery. Items must be unused, unwashed, and in original packaging with tags attached.' },
      { q: 'How do I initiate a return?', a: 'Go to My Account → My Orders → Return Item. Select your items and reason. We\'ll schedule a free pickup within 2 business days.' },
      { q: 'When will I get my refund?', a: 'Refunds are processed within 5–7 business days after we receive the returned item. You\'ll get an email confirmation once processed.' },
      { q: 'Can I exchange an item?', a: 'We don\'t support direct exchanges right now. Return the item and place a new order — you\'ll receive store credit which makes this seamless.' },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      { q: 'How do I find my size?', a: 'Use our Size Recommender — enter your height, weight, chest, and shoulder measurements and it will suggest the perfect size for your preferred fit.' },
      { q: 'What does GSM mean?', a: 'GSM (grams per square metre) is a measure of fabric weight. Higher GSM = heavier, more structured fabric. Our tees range from 180 GSM (light) to 280 GSM (heavy).' },
      { q: 'Are the colours accurate in photos?', a: 'We shoot products in calibrated lighting to represent colours as accurately as possible. However, screen settings can vary slightly. When in doubt, check the fabric name description.' },
      { q: 'Do you use 100% cotton?', a: 'Our standard collection uses 100% ring-spun cotton. The Premium Collection uses Pima cotton and cotton-modal blends for extra softness.' },
    ],
  },
  {
    category: 'Tools',
    items: [
      { q: 'How do I use the Size Guide?', a: 'Measure your chest and shoulder with a tape. Use the table in the Size Guide to map measurements to our sizes.' },
      { q: 'Is my photo stored?', a: 'We do not store any photos uploaded for sizing guidance. If you choose to upload for reference, it is not used for training.' },
      { q: 'How accurate is the Size Recommender?', a: 'Our rule-based engine uses chest and shoulder measurements as primary inputs — these are the most reliable predictors of t-shirt fit.' },
    ],
  },
  {
    category: 'Account & Security',
    items: [
      { q: 'How do I create an account?', a: 'Click the person icon in the top navigation bar, then Sign Up. You can register with your email and set a password.' },
      { q: 'I forgot my password. What do I do?', a: 'Click "Forgot Password" on the login page. We\'ll send a reset link to your email within a few minutes.' },
      { q: 'Is my payment information secure?', a: 'Yes. We do not store card details on our servers. All payments are processed by PCI DSS compliant gateways (Razorpay / Stripe). We use HTTPS across the entire site.' },
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
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(
    (cat) =>
      (activeCategory === 'All' || cat.category === activeCategory) &&
      cat.items.length > 0
  );

  const categories = ['All', ...FAQ_CATEGORIES.map((c) => c.category)];

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 text-center">
          <ScrollReveal animation="fade-up">
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Help Centre</p>
            <h1 className="text-3xl sm:text-5xl font-black mb-4" style={{ color: 'var(--fg)' }}>
              Frequently Asked Questions
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
              Can't find what you need? <a href="/contact" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Contact us</a>
            </p>
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                className="w-full pl-11 pr-4 py-3.5 rounded-full text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeCategory === cat ? 'var(--primary)' : 'var(--bg-card)',
                color: activeCategory === cat ? 'var(--primary-fg)' : 'var(--fg-muted)',
                border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--fg-muted)' }}>
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>No results found</p>
            <p className="text-sm">Try a different keyword or <a href="/contact" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>ask us directly</a></p>
          </div>
        )}

        <div className="space-y-8">
          {filtered.map((cat) => (
            <ScrollReveal key={cat.category} animation="fade-up">
              <div>
                <h2 className="text-xs font-black tracking-[0.25em] uppercase mb-4" style={{ color: 'var(--fg-muted)' }}>
                  {cat.category}
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {cat.items.map((item, i) => {
                    const key = `${cat.category}-${i}`;
                    const isOpen = openItem === key;
                    return (
                      <div key={key} style={{ borderBottom: i < cat.items.length - 1 ? '1px solid var(--border)' : undefined }}>
                        <button
                          onClick={() => setOpenItem(isOpen ? null : key)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                          style={{ background: isOpen ? 'var(--bg-elevated)' : 'var(--bg-card)' }}
                        >
                          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.q}</span>
                          {isOpen
                            ? <ChevronUp size={16} className="flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                            : <ChevronDown size={16} className="flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)', background: 'var(--bg-elevated)' }}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </main>
  );
}
