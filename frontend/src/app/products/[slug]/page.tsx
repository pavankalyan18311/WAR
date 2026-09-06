'use client';

import { useState, useEffect, use } from 'react';
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
import { getProductBySlug } from '@/lib/supabase/queries';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { formatPrice, calculateDiscount, cn } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import ScrollReveal from '@/components/ui/ScrollReveal';
import type { SizeEnum, ProductVariant, Review } from '@/types';

// ─── Delivery Estimator ───────────────────────────────────────────────────────
function DeliveryEstimator() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ days: string; courier?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setError('Enter a valid 6-digit pincode');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/shipping/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode }),
      });
      const data = await res.json();
      if (res.ok && data.serviceable) {
        setResult({
          days: data.estimated_delivery_days || '3–5 business days',
          courier: data.courier_name,
        });
      } else {
        setError(data.error || 'Pincode is unserviceable for delivery');
      }
    } catch (err) {
      setError('Failed to check pincode. Please try again.');
    } finally {
      setLoading(false);
    }
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
          className="px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-60 transition-opacity cursor-pointer"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {loading ? '…' : 'Check'}
        </button>
      </div>
      {error && <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      {result && (
        <div className="flex flex-col gap-1 mt-2.5 text-xs font-semibold" style={{ color: 'var(--success)' }}>
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle size={14} />
            <span>Estimated delivery: <strong>{result.days}</strong></span>
          </div>
          {result.courier && (
            <span className="text-[11px] ml-5" style={{ color: 'var(--fg-muted)' }}>
              Delivery partner: <strong>{result.courier}</strong>
            </span>
          )}
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

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolvedParams = typeof (params as any)?.then === 'function' ? use(params as Promise<{ slug: string }>) : (params as { slug: string });
  const slug = resolvedParams?.slug;
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<SizeEnum | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [addedToCart, setAddedToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);
  const recentlyViewed = useRecentlyViewedStore((s) => s.items);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProductBySlug(slug)
      .then((p) => {
        if (mounted) {
          setProduct(p);
          if (p?.colors?.[0]?.name) setSelectedColor(p.colors[0].name);
        }
      })
      .catch((err) => { console.error('getProductBySlug', err); if (mounted) setProduct(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    if (product) addRecentlyViewed(product);
  }, [product, addRecentlyViewed]);

  useEffect(() => {
    if (product?.category_id) {
      import('@/lib/supabase/queries').then(({ getProducts }) => {
        getProducts({ categoryId: product.category_id, limit: 5 }).then((prods) => {
          setRelatedProducts((prods || []).filter((p: any) => p.product_id !== product.product_id).slice(0, 4));
        }).catch(() => {});
      });
    }
  }, [product?.category_id, product?.product_id]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">Loading...</div>;
  }
  if (!product) {
    return <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">Product not found</div>;
  }

  const inWishlist = isInWishlist(product.product_id);

  const discountPercent = product.discount_price
    ? calculateDiscount(product.price, product.discount_price)
    : null;

  const availableSizes = product.variants
    ?.filter((v: ProductVariant) => v.color === selectedColor || !selectedColor)
    .map((v: ProductVariant) => v.size) ?? [];

  const selectedVariant: ProductVariant | undefined = product.variants?.find(
    (v: ProductVariant) => v.size === selectedSize && (v.color === selectedColor || !selectedColor)
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

  const related = relatedProducts;

  const soldThisMonth = 80 + (product.product_id.charCodeAt(1) % 120);
  const viewersToday = 12 + (product.product_id.charCodeAt(1) % 40);

  const productReviews: Review[] = product.reviews || [];
  const avgRating = product.rating || (productReviews.length > 0 ? productReviews.reduce((s: number, r: any) => s + r.rating, 0) / productReviews.length : 5.0);
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: productReviews.filter((r: any) => r.rating === star).length,
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
            {product.images.map((img: { url: string; alt?: string }, i: number) => (
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
                {product.colors.map((color: { name: string; hex?: string }) => (
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
              {(() => {
                const sizesFromProduct = (product.sizes || []).map((s: any) => typeof s === 'string' ? s : s.name).filter(Boolean);
                const sizesFromVariants = (product.variants || []).map((v: any) => v.size).filter(Boolean);
                const availableSizeList = Array.from(new Set([...sizesFromProduct, ...sizesFromVariants]));
                const displaySizes = availableSizeList;

                if (displaySizes.length === 0) {
                  return (
                    <p className="text-xs font-semibold text-[var(--fg-muted)]">
                      Standard Size
                    </p>
                  );
                }

                return displaySizes.map((size) => {
                  const variantForSize = product.variants?.find(
                    (v: any) => v.size === size && (v.color === selectedColor || !selectedColor)
                  );
                  const hasVariant = !!variantForSize;
                  const isOutOfStock = variantForSize
                    ? variantForSize.status === 'out_of_stock' || variantForSize.status === 'inactive' || (variantForSize.stock_quantity ?? 0) <= 0
                    : false;
                  const available = hasVariant && !isOutOfStock;
                  const active = selectedSize === (size as any);

                  return (
                    <button key={size}
                      data-testid={`size-button-${size}`}
                      onClick={() => { if (available) { setSelectedSize(size as any); setSizeError(false); } }}
                      disabled={!available}
                      className="min-w-12 h-12 px-3 text-sm font-semibold rounded-xl transition-all relative group"
                      style={{
                        background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                        color: active ? 'var(--primary-fg)' : available ? 'var(--fg)' : 'var(--fg-subtle)',
                        border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        opacity: available ? 1 : 0.4,
                        cursor: available ? 'pointer' : 'not-allowed',
                        textDecoration: available ? 'none' : 'line-through',
                      }}>
                      {size}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Stock Quantity / Out of Stock Banner */}
            {selectedVariant && (
              <div className="mt-2.5">
                {(selectedVariant.stock_quantity ?? 0) <= 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                    Out of Stock
                  </span>
                ) : (selectedVariant.stock_quantity ?? 0) <= 5 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    Only {selectedVariant.stock_quantity} left in stock!
                  </span>
                ) : null}
              </div>
            )}

            <div data-testid="size-selector" />
            {sizeError && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>
                Please select an available size before adding to cart.
              </p>
            )}
          </div>

          {/* Stock status calculation */}
          {(() => {
            const isSelectedVariantAvailable = selectedVariant
              ? selectedVariant.status !== 'out_of_stock' && selectedVariant.status !== 'inactive'
              : (product.is_in_stock ?? true);

            const isProductAvailable = product.variants && product.variants.length > 0
              ? product.variants.some((v: any) => v.status !== 'out_of_stock' && v.status !== 'inactive')
              : (product.is_in_stock ?? true);

            const isCanBuy = isSelectedVariantAvailable && isProductAvailable;

            return (
              <div className="flex gap-3 mb-5">
                <button data-testid="pdp-add-to-cart" onClick={handleAddToCart}
                  disabled={addedToCart || !isCanBuy}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: !isCanBuy
                      ? 'var(--bg-elevated)'
                      : addedToCart
                      ? '#22c55e'
                      : 'var(--primary)',
                    color: !isCanBuy
                      ? 'var(--danger)'
                      : 'var(--primary-fg)',
                    border: !isCanBuy ? '1.5px solid var(--danger)' : 'none'
                  }}>
                  {!isCanBuy ? (
                    <>OUT OF STOCK</>
                  ) : addedToCart ? (
                    <><CheckCircle size={17} /> Added!</>
                  ) : (
                    <><ShoppingBag size={17} /> Add to Cart</>
                  )}
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
            );
          })()}

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
                {(() => {
                  const desc = product.description || '';
                  const parsedFab = desc.match(/Fabric:\s*([^\n]+)/i)?.[1]?.trim();
                  const parsedFit = desc.match(/Fit:\s*([^\n]+)/i)?.[1]?.trim();
                  const parsedCare = desc.match(/Care:\s*([^\n]+)/i)?.[1]?.trim();

                  const fab = product.fabric || parsedFab || '100% Heavyweight Cotton';
                  const fit = product.fit_type || parsedFit || 'Regular';
                  const care = product.care_instructions || parsedCare || 'Machine wash cold inside out, tumble dry low';

                  return [
                    { label: 'Fabric', value: fab },
                    { label: 'Weight', value: product.weight ? `${product.weight} GSM` : '240 GSM' },
                    { label: 'Fit Type', value: fit.charAt(0).toUpperCase() + fit.slice(1) },
                    { label: 'Bio-Washed', value: 'Yes' },
                    { label: 'Pre-Shrunk', value: 'Yes' },
                    { label: 'Care', value: care },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="w-24 flex-shrink-0 font-semibold" style={{ color: 'var(--fg)' }}>{label}</span>
                      <span style={{ color: 'var(--fg-muted)' }}>{value}</span>
                    </div>
                  ));
                })()}
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
              {tab === 'reviews' ? `Reviews (${productReviews.length})` : 'Details'}
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
                  <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{productReviews.length} reviews</p>
                </div>
                <div className="space-y-2">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-right" style={{ color: 'var(--fg-muted)' }}>{star}</span>
                      <Star size={10} style={{ color: '#f59e0b', fill: '#f59e0b', flexShrink: 0 }} />
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${productReviews.length > 0 ? (count / productReviews.length) * 100 : 0}%`, background: 'var(--primary)' }} />
                      </div>
                      <span className="w-4" style={{ color: 'var(--fg-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="lg:col-span-2 space-y-4">
                {productReviews.length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>No customer reviews yet for this product.</p>
                  </div>
                ) : (
                  productReviews.map((review: any) => (
                    <div key={review.review_id || review.id} className="p-5 rounded-2xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {review.user?.avatar && (
                            <Image src={review.user.avatar} alt={review.user.name} width={36} height={36}
                              className="rounded-full flex-shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{review.user?.name || 'Verified Customer'}</p>
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
                        {review.created_at && (
                          <p className="text-xs flex-shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                            {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      {review.title && (
                        <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>{review.title}</p>
                      )}
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{review.body || review.comment}</p>
                    </div>
                  ))
                )}
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
              {related.map((p) => <ProductCard key={p.product_id} product={p as any} />)}
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
