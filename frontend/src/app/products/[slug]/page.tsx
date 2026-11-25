'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Plus, Minus, Check } from 'lucide-react';
import { getProductBySlug } from '@/lib/supabase/queries';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useIsInWishlist, useWishlistStore } from '@/store/wishlistStore';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { formatPrice } from '@/lib/utils';
import { priceDisplay } from '@/lib/productPrice';
import { isVariantAvailable } from '@/lib/stock';
import { productSpecs } from '@/lib/productSpecs';
import { storePolicy } from '@/lib/storePolicy';
import ProductGallery from '@/components/product/ProductGallery';
import ShareMenu from '@/components/product/ShareMenu';
import StickyBuyBar from '@/components/product/StickyBuyBar';
import BackInStockForm from '@/components/product/BackInStockForm';
import ProductRail from '@/components/product/ProductRail';
import ProductReviews from '@/components/product/ProductReviews';
import SizeGuideDrawer from '@/components/product/SizeGuideDrawer';
import ShippingNote from '@/components/ui/ShippingNote';
import type { SizeEnum, ProductVariant } from '@/types';

// ─── Delivery Estimator ───────────────────────────────────────────────────────
function DeliveryEstimator() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ days: string; courier?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!/^\d{6}$/.test(pincode)) {
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
        setResult({ days: data.estimated_delivery_days ?? '', courier: data.courier_name });
      } else {
        setError(data.error || 'Pincode is unserviceable for delivery');
      }
    } catch {
      setError('Failed to check pincode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="eyebrow mb-3">Check delivery</p>
      <div className="flex border-b" style={{ borderColor: 'var(--border-strong)' }}>
        <input type="text" inputMode="numeric" maxLength={6} value={pincode}
          onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setResult(null); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="Enter your pincode" aria-label="Pincode"
          className="flex-1 py-2.5 text-sm bg-transparent outline-none" style={{ color: 'var(--fg)' }} />
        <button onClick={check} disabled={loading}
          className="text-[11px] font-semibold uppercase tracking-[0.18em] px-2 disabled:opacity-50 hover:text-[var(--accent)]">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </div>
      {error && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      {result && (
        <p className="text-sm mt-2.5 flex items-center gap-2" style={{ color: 'var(--success)' }}>
          <Check size={14} />
          {result.days ? <>Estimated delivery: <strong>{result.days}</strong></> : 'We deliver to this pincode'}
          {result.courier && <span style={{ color: 'var(--fg-muted)' }}>· {result.courier}</span>}
        </p>
      )}
    </div>
  );
}

// ─── Accordion ───────────────────────────────────────────────────────────────
function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: 'var(--border-strong)' }}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex items-center justify-between py-4 text-left gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">{title}</span>
        {open ? <Minus size={14} /> : <Plus size={14} />}
      </button>
      {open && <div className="pb-5 text-sm leading-relaxed space-y-1" style={{ color: 'var(--fg-muted)' }}>{children}</div>}
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const resolvedParams = typeof (params as any)?.then === 'function' ? use(params as Promise<{ slug: string }>) : (params as { slug: string });
  const slug = resolvedParams?.slug;
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<SizeEnum | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const actionsRef = useRef<HTMLDivElement>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const inWishlist = useIsInWishlist(product?.product_id);
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

  useEffect(() => { setPageUrl(window.location.href); }, [slug]);

  // "You may also like": similar products first (category, fit, tags, colour, price), topped up with the rest.
  useEffect(() => {
    if (!product) return;
    let mounted = true;
    Promise.all([import('@/lib/supabase/queries'), import('@/lib/suggestProducts')])
      .then(([{ getProducts }, { suggestProducts }]) =>
        getProducts({ limit: 48 }).then((prods) => { if (mounted) setRelatedProducts(suggestProducts(product, prods || [])); }))
      .catch(() => {});
    return () => { mounted = false; };
  }, [product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-10 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7 aspect-[4/5] skeleton" />
        <div className="md:col-span-5 space-y-4">
          <div className="h-4 w-24 skeleton" /><div className="h-10 w-3/4 skeleton" /><div className="h-6 w-32 skeleton" />
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-24 text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="text-4xl mb-6">Product not found</h1>
        <Link href="/products" className="btn-outline">Browse all products</Link>
      </div>
    );
  }

  const priceInfo = priceDisplay(product);

  const selectedVariant: ProductVariant | undefined = product.variants?.find(
    (v: ProductVariant) => v.size === selectedSize && (v.color === selectedColor || !selectedColor)
  );

  const sizesFromProduct = (product.sizes || []).map((s: any) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
  const sizesFromVariants = (product.variants || []).map((v: any) => v.size).filter(Boolean);
  const displaySizes: string[] = Array.from(new Set<string>([...sizesFromProduct, ...sizesFromVariants]));

  const isProductAvailable = (product.variants ?? []).some(isVariantAvailable);
  const canBuy = (selectedVariant ? isVariantAvailable(selectedVariant) : !!product.is_in_stock || isProductAvailable) && isProductAvailable;

  const handleAddToCart = () => {
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!selectedSize) { setSizeError(true); return; }
    setSizeError(false);
    const variant = selectedVariant ?? product.variants?.[0];
    if (variant) {
      addItem(product, variant, 1);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  // Sold-out size chosen → offer "notify me" instead of Add to cart.
  const selectedSoldOut = !!selectedVariant && !isVariantAvailable(selectedVariant);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const specs = productSpecs(product);
  const recent = recentlyViewed.filter((p) => p.product_id !== product.product_id).slice(0, 10);
  const images: { url: string; alt?: string }[] = product.images ?? [];

  return (
    <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-[11px] uppercase tracking-[0.18em] mb-8 flex gap-2 items-center flex-wrap" style={{ color: 'var(--fg-subtle)' }}>
        <Link href="/" className="hover:text-[var(--fg)]">Home</Link>
        <span>/</span>
        <Link href={product.category ? `/products?category=${product.category.slug}` : '/products'} className="hover:text-[var(--fg)]">
          {product.category?.name ?? 'Products'}
        </Link>
        <span>/</span>
        <span className="truncate" style={{ color: 'var(--fg-muted)' }}>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-12 gap-8 lg:gap-14">
        {/* ── Gallery ───────────────────────────────── */}
        <div className="md:col-span-7">
          <ProductGallery images={images} alt={product.name} badge={priceInfo.mrp ? (
            <span className="absolute top-4 left-4 text-[10px] px-2 py-1 font-semibold tracking-[0.1em]" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              −{priceInfo.percent}%
            </span>
          ) : null} />
        </div>
        {/* ── Details ────────────────────────────────── */}
        <div className="md:col-span-5 md:sticky md:top-28 self-start">
          {product.category && <p className="eyebrow mb-3">{product.category.name}</p>}
          <h1 data-testid="product-title" className="leading-[1.05] mb-5" style={{ fontSize: 'clamp(2rem, 3.4vw, 2.9rem)' }}>
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-semibold" style={{ color: priceInfo.mrp ? 'var(--accent)' : 'var(--fg)' }}>
              {formatPrice(priceInfo.price)}
            </span>
            {priceInfo.mrp && (
              <>
                <span className="text-base line-through" style={{ color: 'var(--fg-subtle)' }}>MRP {formatPrice(priceInfo.mrp)}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                  Save {formatPrice(priceInfo.saving)}
                </span>
              </>
            )}
          </div>
          <p className="text-xs mt-1.5 mb-7" style={{ color: 'var(--fg-subtle)' }}>Inclusive of all taxes</p>

          {product.description && (
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: 'var(--fg-muted)' }}>{product.description}</p>
          )}

          {/* Colour */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-7">
              <p className="eyebrow mb-3">Colour — <span style={{ color: 'var(--fg)' }}>{selectedColor}</span></p>
              <div className="flex gap-3">
                {product.colors.map((color: { name: string; hex?: string }) => (
                  <button key={color.name} title={color.name} aria-label={color.name}
                    onClick={() => { setSelectedColor(color.name); setSelectedSize(null); }}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: color.hex,
                      boxShadow: 'inset 0 0 0 1px var(--border-strong)',
                      outline: selectedColor === color.name ? '1px solid var(--fg)' : 'none',
                      outlineOffset: 3,
                    }} />
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          <div id="size-picker" className="mb-7 scroll-mt-28">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow" style={{ color: sizeError ? 'var(--danger)' : undefined }}>
                Size — <span style={{ color: sizeError ? 'var(--danger)' : 'var(--fg)' }}>{selectedSize ?? 'Select'}</span>
              </p>
              <SizeGuideDrawer sizeChartId={product.size_chart_id} selectedSize={selectedSize} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {displaySizes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Standard size</p>
              ) : displaySizes.map((size) => {
                const variantForSize = product.variants?.find((v: any) => v.size === size && (v.color === selectedColor || !selectedColor));
                const available = !!variantForSize && isVariantAvailable(variantForSize);
                const active = selectedSize === (size as any);
                return (
                  <button key={size} data-testid={`size-button-${size}`}
                    onClick={() => { if (variantForSize) { setSelectedSize(size as any); setSizeError(false); } }}
                    disabled={!variantForSize}
                    data-soldout={!available || undefined}
                    title={available ? undefined : 'Sold out — tap to get notified when it is back'}
                    className="min-w-[3.25rem] h-12 px-3 text-sm font-medium transition-colors"
                    style={{
                      background: active ? 'var(--fg)' : 'transparent',
                      color: active ? 'var(--bg)' : available ? 'var(--fg)' : 'var(--fg-subtle)',
                      border: `1px solid ${active ? 'var(--fg)' : 'var(--border-strong)'}`,
                      opacity: available ? 1 : 0.45,
                      cursor: variantForSize ? 'pointer' : 'not-allowed',
                      textDecoration: available ? 'none' : 'line-through',
                    }}>
                    {size}
                  </button>
                );
              })}
            </div>
            {selectedVariant && (selectedVariant.stock_quantity ?? 0) > 0 && (selectedVariant.stock_quantity ?? 0) <= 5 && (
              <p className="text-xs mt-3 font-medium" style={{ color: 'var(--warning)' }}>Only {selectedVariant.stock_quantity} left</p>
            )}
            <div data-testid="size-selector" />
            {sizeError && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>Please select a size.</p>}
          </div>

          {/* Actions */}
          <div ref={actionsRef} id="buy-actions" className="flex gap-2 mb-8 items-end scroll-mt-28">
            {selectedSoldOut ? (
              <BackInStockForm key={selectedVariant!.variant_id} variantId={selectedVariant!.variant_id} size={selectedSize} defaultEmail={user?.email ?? ''} />
            ) : (
            <button data-testid="pdp-add-to-cart" onClick={handleAddToCart} disabled={addedToCart || !canBuy}
              className="btn-primary flex-1 !py-4"
              style={!canBuy ? { background: 'transparent', color: 'var(--fg-subtle)', borderColor: 'var(--border-strong)' } : addedToCart ? { background: 'var(--success)', borderColor: 'var(--success)' } : undefined}>
              {!canBuy ? 'Sold out' : addedToCart ? <><Check size={15} /> Added to bag</> : 'Add to cart'}
            </button>
            )}
            <button onClick={() => toggleItem(product)} aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className="w-14 h-[52px] shrink-0 flex items-center justify-center border transition-colors hover:border-[var(--fg)]"
              style={{ borderColor: 'var(--border-strong)' }}>
              <Heart size={17} style={{ color: inWishlist ? 'var(--accent)' : 'var(--fg)', fill: inWishlist ? 'var(--accent)' : 'none' }} />
            </button>
            <ShareMenu title={product.name} url={pageUrl} />
          </div>
          {!isProductAvailable && !selectedSize && (
            <p className="text-xs -mt-5 mb-8" style={{ color: 'var(--fg-muted)' }}>Sold out right now — choose your size to get an email when it&apos;s back.</p>
          )}

          {/* Promises */}
          <ul className="grid grid-cols-3 border-y mb-8 text-[11px] uppercase tracking-[0.14em] text-center" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-muted)' }}>
            <li className="py-4 px-1"><ShippingNote variant="badge" /></li>
            <li className="py-4 px-1 border-x" style={{ borderColor: 'var(--border)' }}>{storePolicy.returnDays}-day returns</li>
            <li className="py-4 px-1">Secure checkout</li>
          </ul>

          <div className="mb-8"><DeliveryEstimator /></div>

          <div className="border-t" style={{ borderColor: 'var(--border-strong)' }}>
            {specs.length > 0 && (
              <Accordion title="Details & fabric" defaultOpen>
                <dl className="space-y-2">
                  {specs.map(({ label, value }) => (
                    <div key={label} className="flex gap-4">
                      <dt className="w-28 flex-shrink-0" style={{ color: 'var(--fg)' }}>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </Accordion>
            )}
            <Accordion title="Shipping & delivery">
              <p><ShippingNote /></p>
              <p>Check your pincode above for the delivery estimate to your area.</p>
            </Accordion>
            <Accordion title="Returns & exchange">
              <p>Return or exchange size within {storePolicy.returnDays} days of delivery.</p>
              <p>Items must be unworn, unwashed and have tags attached.</p>
              <p>Refund within {storePolicy.refundDays} after quality check.</p>
              <Link href="/refund-policy" className="link-rule inline-block mt-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--fg)' }}>
                Full refund policy
              </Link>
            </Accordion>
          </div>
        </div>
      </div>

      <StickyBuyBar targetRef={actionsRef} name={product.name} price={formatPrice(priceInfo.price)} selectedSize={selectedSize}
        actionLabel={selectedSoldOut ? 'Notify me' : addedToCart ? 'Added' : 'Add to cart'}
        actionDisabled={!selectedSoldOut && (addedToCart || !canBuy)}
        onAction={selectedSoldOut ? () => scrollTo('buy-actions') : handleAddToCart}
        onChooseSize={() => scrollTo('size-picker')} />

      <ProductReviews productId={product.product_id} productSlug={product.slug} />

      {/* Related + recently viewed: swipeable rails */}
      <ProductRail eyebrow="Picked for you" title="You may also like" products={relatedProducts} />
      <ProductRail eyebrow="Your history" title="Recently viewed" products={recent} />
    </div>
  );
}
