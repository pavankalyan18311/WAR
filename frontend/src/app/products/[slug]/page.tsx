'use client';

import { useState, use, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Heart,
  ShoppingBag,
  Truck,
  RotateCcw,
  Shield,
  Share2,
  Camera,
  Ruler,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Flame,
  Eye,
  BadgeCheck,
} from 'lucide-react';
import { getProductBySlug, MOCK_PRODUCTS } from '@/lib/mockData';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { formatPrice, calculateDiscount, cn } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import ScrollReveal from '@/components/ui/ScrollReveal';
import type { SizeEnum, ProductVariant, Review } from '@/types';

// ─── Mock reviews ─────────────────────────────────────────────────────────────
const MOCK_REVIEWS: Review[] = [
  { review_id: 'r1', user: { name: 'Arjun S.', avatar: 'https://i.pravatar.cc/40?img=11' }, rating: 5, title: "Best oversized tee I've owned", body: 'The fabric quality is incredible. 240 GSM is just the right weight — not too heavy, not too thin. Washes well too, no pilling after 10 washes.', verified_purchase: true, created_at: '2026-05-10T09:00:00Z' },
  { review_id: 'r2', user: { name: 'Rahul M.', avatar: 'https://i.pravatar.cc/40?img=22' }, rating: 5, title: 'Perfect fit, fast delivery', body: 'Ordered L, fits exactly as expected. The size recommender suggested L based on my measurements and it was spot on. Color is exactly as shown.', verified_purchase: true, created_at: '2026-04-28T15:30:00Z' },
  { review_id: 'r3', user: { name: 'Karan P.', avatar: 'https://i.pravatar.cc/40?img=33' }, rating: 4, title: 'Great quality, slightly pricey', body: 'Genuinely premium quality — the stitching, fabric feel, everything is top notch. Docking one star only because I wish there were more colour options.', verified_purchase: false, created_at: '2026-04-15T12:00:00Z' },
  { review_id: 'r4', user: { name: 'Vikram T.', avatar: 'https://i.pravatar.cc/40?img=44' }, rating: 5, title: 'Bought 3 pieces!', body: 'Already on my third purchase. Tried Virtual Try-On for the first time — it actually helped me pick the right colour. ThreadX is the best.', verified_purchase: true, created_at: '2026-03-20T08:00:00Z' },
];

// ─── Delivery Estimator ───────────────────────────────────────────────────────
function DeliveryEstimator() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ days: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setError('Enter a valid 6-digit pincode');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    const prefix = pincode.slice(0, 2);
    const metro = ['11', '40', '56', '60', '70', '50'];
    const days = metro.includes(prefix) ? '2–3 business days' : '4–6 business days';
    setResult({ days });
  };

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Truck size={14} style={{ color: 'var(--accent)' }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Check Delivery</p>
      </div>
      <div className="flex gap-2">
        <input type="text" maxLength={6} value={pincode}
          onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setResult(null); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="Enter your pincode"
          className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
          style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
        />
        <button onClick={check} disabled={loading}
          className="px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {loading ? '…' : 'Check'}
        </button>
      </div>
      {error && <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      {result && (
        <div className="flex items-center gap-2 mt-2.5 text-sm font-semibold" style={{ color: 'var(--success)' }}>
          <CheckCircle size={13} />
          Estimated delivery: <strong>{result.days}</strong>
        </div>
      )}
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────────────
function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-3">
        <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{title}</span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--fg-subtle)' }} /> : <ChevronDown size={14} style={{ color: 'var(--fg-subtle)' }} />}
      </button>
      {open && <div className="pb-4 text-sm leading-relaxed space-y-1" style={{ color: 'var(--fg-muted)' }}>{children}</div>}
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          style={{ color: i <= Math.round(rating) ? '#f59e0b' : 'var(--border)', fill: i <= Math.round(rating) ? '#f59e0b' : 'transparent' }} />
      ))}
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<SizeEnum | null>(null);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name ?? '');
  const [sizeError, setSizeError] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [addedToCart, setAddedToCart] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const inWishlist = isInWishlist(product.product_id);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);
  const recentlyViewed = useRecentlyViewedStore((s) => s.items);

  useEffect(() => { addRecentlyViewed(product); }, [product.product_id]); // eslint-disable-line

  const discountPercent = product.discount_price
    ? calculateDiscount(product.price, product.discount_price)
    : null;

  const availableSizes = product.variants
    ?.filter((v) => v.color === selectedColor || !selectedColor)
    .map((v) => v.size) ?? [];

  const selectedVariant: ProductVariant | undefined = product.variants?.find(
    (v) => v.size === selectedSize && (v.color === selectedColor || !selectedColor)
  );

  const handleAddToCart = () => {
    if (!selectedSize) { setSizeError(true); return; }
    setSizeError(false);
    const variant = selectedVariant ?? product.variants?.[0];
    if (variant) {
      addItem(product, variant, 1);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const related = MOCK_PRODUCTS.filter(
    (p) => p.category_id === product.category_id && p.product_id !== product.product_id
  ).slice(0, 4);

  const soldThisMonth = 80 + (product.product_id.charCodeAt(1) % 120);
  const viewersToday = 12 + (product.product_id.charCodeAt(1) % 40);

  const avgRating = MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: MOCK_REVIEWS.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs mb-6 flex gap-1.5 items-center flex-wrap" style={{ color: 'var(--fg-subtle)' }}>
        <Link href="/" className="hover:opacity-70">Home</Link>
        <ChevronRight size={12} />
        <Link href="/products" className="hover:opacity-70">{product.category?.name ?? 'Products'}</Link>
        <ChevronRight size={12} />
        <span className="truncate" style={{ color: 'var(--fg-muted)' }}>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        {/* ── Image Gallery ───────────────────────────────── */}
          <div className="flex gap-3">
          <div className="flex flex-col gap-2 w-16 flex-shrink-0">
            {product.images.map((img, i) => (
              <button key={i} data-testid={`pdp-thumb-${i}`} onClick={() => setSelectedImageIdx(i)}
                className="relative w-16 h-20 rounded-lg overflow-hidden transition-all"
                style={{
                  border: `2px solid ${selectedImageIdx === i ? 'var(--primary)' : 'var(--border)'}`,
                  opacity: selectedImageIdx === i ? 1 : 0.6,
                }}>
                <Image src={img.url} alt={img.alt ?? product.name} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>

          <div data-testid="pdp-main-image" className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)' }}>
            <Image src={product.images[selectedImageIdx]?.url ?? ''} alt={product.name}
              fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
            {discountPercent && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'var(--danger)', color: '#fff' }}>
                {discountPercent}% OFF
              </div>
            )}
            {/* Social proof pills */}
            <div className="absolute bottom-4 left-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold w-fit"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                <Flame size={11} style={{ color: '#f97316' }} />
                {soldThisMonth} sold this month
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold w-fit"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                <Eye size={11} />
                {viewersToday} viewing now
              </div>
            </div>
          </div>
        </div>

        {/* ── Product Info ────────────────────────────────── */}
        <div>
          {product.category && (
            <Link href={`/products?category=${product.category.slug}`}
              className="text-xs font-bold tracking-widest uppercase hover:opacity-70"
              style={{ color: 'var(--accent)' }}>
              {product.category.name}
            </Link>
          )}
          <h1 data-testid="product-title" className="text-2xl sm:text-3xl font-black mt-1 mb-3 leading-tight" style={{ color: 'var(--fg)' }}>
            {product.name}
          </h1>

          {product.rating && (
            <button onClick={() => setActiveTab('reviews')}
              className="flex items-center gap-2 mb-4 group">
              <Stars rating={product.rating} />
              <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{product.rating}</span>
              <span className="text-sm group-hover:underline" style={{ color: 'var(--accent)' }}>
                ({product.review_count} reviews)
              </span>
            </button>
          )}

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-black" style={{ color: 'var(--fg)' }}>
              {formatPrice(product.discount_price ?? product.price)}
            </span>
            {product.discount_price && (
              <>
                <span className="text-lg line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(product.price)}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                  Save {formatPrice(product.price - product.discount_price)}
                </span>
              </>
            )}
          </div>

          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--fg-muted)' }}>{product.description}</p>

          {/* Colour picker */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                COLOUR: <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>{selectedColor}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button key={color.name} title={color.name}
                    onClick={() => { setSelectedColor(color.name); setSelectedSize(null); }}
                    className="w-8 h-8 rounded-full transition-all hover:scale-110"
                    style={{
                      background: color.hex,
                      outline: selectedColor === color.name ? '3px solid var(--primary)' : '2px solid var(--border)',
                      outlineOffset: selectedColor === color.name ? '3px' : '1px',
                    }} />
                ))}
              </div>
            </div>
          )}

          {/* Size picker */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: sizeError ? 'var(--danger)' : 'var(--fg)' }}>
                SIZE:{' '}
                {selectedSize
                  ? <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>{selectedSize}</span>
                  : <span className="font-normal" style={{ color: 'var(--fg-subtle)' }}>Select Size</span>}
              </p>
              <Link href="/size-guide" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                Size Guide →
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as SizeEnum[]).map((size) => {
                const available = availableSizes.includes(size) || availableSizes.length === 0;
                const active = selectedSize === size;
                return (
                  <button key={size}
                    data-testid={`size-button-${size}`}
                    onClick={() => { if (available) { setSelectedSize(size); setSizeError(false); } }}
                    disabled={!available}
                    className="w-12 h-12 text-sm font-semibold rounded-xl transition-all"
                    style={{
                      background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: active ? 'var(--primary-fg)' : available ? 'var(--fg)' : 'var(--fg-subtle)',
                      border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      opacity: available ? 1 : 0.35,
                      cursor: available ? 'pointer' : 'not-allowed',
                      textDecoration: available ? 'none' : 'line-through',
                    }}>
                    {size}
                  </button>
                );
              })}
            </div>
            <div data-testid="size-selector" />
            {sizeError && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>
                Please select a size before adding to cart.
              </p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-3 mb-5">
            <button data-testid="pdp-add-to-cart" onClick={handleAddToCart}
              className="flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: addedToCart ? '#22c55e' : 'var(--primary)', color: 'var(--primary-fg)' }}>
              {addedToCart
                ? <><CheckCircle size={17} /> Added!</>
                : <><ShoppingBag size={17} /> Add to Cart</>}
            </button>
            <button onClick={() => toggleItem(product)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              style={{
                background: inWishlist ? 'var(--danger)' : 'var(--bg-card)',
                border: `1.5px solid ${inWishlist ? 'var(--danger)' : 'var(--border)'}`,
              }}
              aria-label="Wishlist">
              <Heart size={18} style={{ color: inWishlist ? '#fff' : 'var(--fg-muted)', fill: inWishlist ? '#fff' : 'none' }} />
            </button>
            <button className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
              aria-label="Share">
              <Share2 size={18} style={{ color: 'var(--fg-muted)' }} />
            </button>
          </div>

          {/* Size tools */}
          <div className="flex gap-3 mb-5">
            <Link href="/size-guide"
              className="flex-1 rounded-xl px-3 py-3 flex items-center gap-2.5 transition-all hover:opacity-80"
              style={{ border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <Ruler size={17} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Size Guide</p>
                <p className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>Find your fit</p>
              </div>
            </Link>
            <Link href="/products"
              className="flex-1 rounded-xl px-3 py-3 flex items-center gap-2.5 transition-all hover:opacity-80"
              style={{ border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <ShoppingBag size={17} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Shop Similar</p>
                <p className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>Explore this style</p>
              </div>
            </Link>
          </div>

          {/* Delivery estimator */}
          <div className="mb-5">
            <DeliveryEstimator />
          </div>

          {/* Assurances */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: Truck, text: 'Free Shipping ₹999+' },
              { icon: RotateCcw, text: '7-Day Returns' },
              { icon: Shield, text: 'Secure Checkout' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center p-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Icon size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--fg-muted)' }}>{text}</p>
              </div>
            ))}
          </div>

          {/* Accordions */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <Accordion title="Product Specifications" defaultOpen>
              <div className="space-y-2">
                {[
                  { label: 'Fabric', value: product.fabric ?? '100% Ring-Spun Cotton' },
                  { label: 'Weight', value: product.weight ? `${product.weight} GSM` : '240 GSM' },
                  { label: 'Fit Type', value: product.fit_type ? product.fit_type.charAt(0).toUpperCase() + product.fit_type.slice(1) : 'Regular' },
                  { label: 'Bio-Washed', value: 'Yes' },
                  { label: 'Pre-Shrunk', value: 'Yes' },
                  { label: 'Care', value: 'Machine wash cold, tumble dry low' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3 text-sm">
                    <span className="w-24 flex-shrink-0 font-semibold" style={{ color: 'var(--fg)' }}>{label}</span>
                    <span style={{ color: 'var(--fg-muted)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Accordion>

            <Accordion title="Shipping & Delivery">
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Free shipping on orders above ₹999</li>
                <li>Metro cities: 2–4 business days</li>
                <li>Tier 2/3 cities: 4–6 business days</li>
                <li>Order before 2 PM for same-day dispatch (weekdays)</li>
              </ul>
            </Accordion>

            <Accordion title="Returns & Refund Policy">
              <ul className="space-y-1.5 list-disc list-inside">
                <li>7-day hassle-free return from date of delivery</li>
                <li>Unused, unwashed, and in original packaging with tags attached</li>
                <li>Free pickup — no need to ship it yourself</li>
                <li>Refund processed within 5–7 business days after receipt</li>
              </ul>
              <Link href="/refund-policy"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}>
                Full Refund Policy <ChevronRight size={12} />
              </Link>
            </Accordion>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="mt-16">
        <div className="flex gap-1 p-1 rounded-xl w-fit mb-8"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {(['details', 'reviews'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all capitalize"
              style={{
                background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab ? 'var(--fg)' : 'var(--fg-muted)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}>
              {tab === 'reviews' ? `Reviews (${MOCK_REVIEWS.length})` : 'Details'}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <ScrollReveal animation="fade-up">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Fabric', value: product.fabric ?? '100% Cotton' },
                { label: 'GSM', value: String(product.weight ?? 240) },
                { label: 'Fit', value: product.fit_type ? product.fit_type.charAt(0).toUpperCase() + product.fit_type.slice(1) : 'Regular' },
                { label: 'Origin', value: 'Made in India' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl p-5 text-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                  <p className="text-lg font-black" style={{ color: 'var(--fg)' }}>{value}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        )}

        {activeTab === 'reviews' && (
          <ScrollReveal animation="fade-up">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Rating summary */}
              <div className="rounded-2xl p-6 h-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-center mb-5">
                  <p className="text-5xl font-black" style={{ color: 'var(--fg)' }}>{avgRating.toFixed(1)}</p>
                  <div className="flex justify-center my-2"><Stars rating={avgRating} size={18} /></div>
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{MOCK_REVIEWS.length} reviews</p>
                </div>
                <div className="space-y-2">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-right" style={{ color: 'var(--fg-muted)' }}>{star}</span>
                      <Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b', flexShrink: 0 }} />
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${(count / MOCK_REVIEWS.length) * 100}%`, background: 'var(--primary)' }} />
                      </div>
                      <span className="w-4" style={{ color: 'var(--fg-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="lg:col-span-2 space-y-4">
                {MOCK_REVIEWS.map((review) => (
                  <div key={review.review_id} className="p-5 rounded-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {review.user.avatar && (
                          <Image src={review.user.avatar} alt={review.user.name} width={36} height={36}
                            className="rounded-full flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{review.user.name}</p>
                            {review.verified_purchase && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold"
                                style={{ color: '#16a34a' }}>
                                <BadgeCheck size={11} /> Verified
                              </span>
                            )}
                          </div>
                          <Stars rating={review.rating} size={11} />
                        </div>
                      </div>
                      <p className="text-xs flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {review.title && (
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>{review.title}</p>
                    )}
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{review.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <ScrollReveal animation="fade-up">
            <h2 className="text-2xl font-black mb-6" style={{ color: 'var(--fg)' }}>YOU MAY ALSO LIKE</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {related.map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.filter((p) => p.product_id !== product.product_id).length > 0 && (
        <section className="mt-16 pt-10" style={{ borderTop: '1px solid var(--border)' }}>
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: 'var(--fg)' }}>Recently Viewed</h2>
              <Link href="/products" className="text-sm font-semibold hover:opacity-70"
                style={{ color: 'var(--fg-muted)' }}>View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {recentlyViewed
                .filter((p) => p.product_id !== product.product_id)
                .slice(0, 4)
                .map((p) => <ProductCard key={p.product_id} product={p} />)}
            </div>
          </ScrollReveal>
        </section>
      )}
    </div>
  );
}
