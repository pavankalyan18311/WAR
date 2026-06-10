'use client';

import { useState, use } from 'react';
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
} from 'lucide-react';
import { getProductBySlug, MOCK_PRODUCTS } from '@/lib/mockData';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, calculateDiscount, cn } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import type { SizeEnum, ProductVariant } from '@/types';

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<SizeEnum | null>(null);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name ?? '');
  const [sizeError, setSizeError] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const inWishlist = isInWishlist(product.product_id);

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
    if (variant) addItem(product, variant, 1);
  };

  const related = MOCK_PRODUCTS.filter(
    (p) => p.category_id === product.category_id && p.product_id !== product.product_id
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-6 flex gap-1.5 items-center flex-wrap">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <ChevronRight size={12} />
        <Link href="/products" className="hover:text-gray-700">Oversized</Link>
        <ChevronRight size={12} />
        <span className="text-gray-700 truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        {/* ── Image Gallery ───────────────────────────────── */}
        <div className="flex gap-3">
          {/* Thumbnails */}
          <div className="flex flex-col gap-2 w-16 flex-shrink-0">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImageIdx(i)}
                className={cn(
                  'relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors',
                  selectedImageIdx === i ? 'border-black' : 'border-transparent'
                )}
              >
                <Image src={img.url} alt={img.alt ?? product.name} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>

          {/* Main Image */}
          <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={product.images[selectedImageIdx]?.url ?? ''}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {discountPercent && (
              <div className="absolute top-4 left-4 bg-black text-white text-xs px-3 py-1 rounded-full font-semibold">
                {discountPercent}% OFF
              </div>
            )}
          </div>
        </div>

        {/* ── Product Info ────────────────────────────────── */}
        <div>
          {product.category && (
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-xs font-semibold tracking-widest text-gray-400 uppercase hover:text-gray-700"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 mb-3 leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    className={cn(i <= Math.round(product.rating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
              <span className="text-sm text-gray-400">({product.review_count} reviews)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-black text-gray-900">
              {formatPrice(product.discount_price ?? product.price)}
            </span>
            {product.discount_price && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  Save {formatPrice(product.price - product.discount_price)}
                </span>
              </>
            )}
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

          {/* Color */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                COLOR: <span className="font-normal text-gray-600">{selectedColor}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    title={color.name}
                    onClick={() => { setSelectedColor(color.name); setSelectedSize(null); }}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                      selectedColor === color.name ? 'border-black scale-110' : 'border-transparent'
                    )}
                    style={{
                      backgroundColor: color.hex,
                      boxShadow: color.hex === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className={cn('text-sm font-semibold', sizeError ? 'text-red-500' : 'text-gray-900')}>
                SIZE: {selectedSize ? <span className="font-normal text-gray-600">{selectedSize}</span> : <span className="font-normal text-gray-400">Select Size</span>}
              </p>
              <Link href="/size-guide" className="text-xs text-gray-500 underline hover:text-black">
                Size Guide
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['S', 'M', 'L', 'XL', 'XXL'] as SizeEnum[]).map((size) => {
                const available = availableSizes.includes(size) || availableSizes.length === 0;
                return (
                  <button
                    key={size}
                    onClick={() => { if (available) { setSelectedSize(size); setSizeError(false); } }}
                    disabled={!available}
                    className={cn(
                      'w-12 h-12 text-sm font-medium border rounded-xl transition-colors',
                      !available && 'opacity-30 cursor-not-allowed line-through',
                      selectedSize === size
                        ? 'bg-black text-white border-black'
                        : 'border-gray-200 text-gray-700 hover:border-gray-800'
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {sizeError && (
              <p className="text-red-500 text-xs mt-1.5">Please select a size before adding to cart.</p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-black text-white py-3.5 rounded-full font-bold text-sm hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} />
              Add to Cart
            </button>
            <button
              onClick={() => toggleItem(product)}
              className={cn(
                'w-12 h-12 border rounded-full flex items-center justify-center transition-colors flex-shrink-0',
                inWishlist
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 hover:border-gray-400'
              )}
              aria-label="Wishlist"
            >
              <Heart
                size={18}
                className={cn(inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500')}
              />
            </button>
            <button
              className="w-12 h-12 border border-gray-200 rounded-full flex items-center justify-center hover:border-gray-400 transition-colors"
              aria-label="Share"
            >
              <Share2 size={18} className="text-gray-500" />
            </button>
          </div>

          {/* AI Feature Links */}
          <div className="flex gap-3 mb-6">
            <Link
              href={`/try-on?product=${product.product_id}`}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-3 flex items-center gap-2.5 hover:border-black hover:bg-gray-50 transition-colors group"
            >
              <Camera size={18} className="text-gray-500 group-hover:text-black" />
              <div>
                <p className="text-xs font-semibold text-gray-900">Virtual Try-On</p>
                <p className="text-[11px] text-gray-500">See it on you</p>
              </div>
            </Link>
            <Link
              href="/size-guide"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-3 flex items-center gap-2.5 hover:border-black hover:bg-gray-50 transition-colors group"
            >
              <Ruler size={18} className="text-gray-500 group-hover:text-black" />
              <div>
                <p className="text-xs font-semibold text-gray-900">Size Recommender</p>
                <p className="text-[11px] text-gray-500">Find your fit</p>
              </div>
            </Link>
          </div>

          {/* Product Details */}
          <div className="border-t border-gray-100 pt-5 space-y-2 text-sm">
            {product.fabric && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-20">Fabric</span>
                <span className="font-medium">{product.fabric}</span>
              </div>
            )}
            {product.fit_type && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-20">Fit</span>
                <span className="font-medium capitalize">{product.fit_type}</span>
              </div>
            )}
            {product.weight && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-20">Weight</span>
                <span className="font-medium">{product.weight} GSM</span>
              </div>
            )}
          </div>

          {/* Assurances */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, text: 'Free Shipping above ₹999' },
              { icon: RotateCcw, text: '7-Day Easy Returns' },
              { icon: Shield, text: 'Secure Checkout' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1 text-center p-2 rounded-lg bg-gray-50">
                <Icon size={16} className="text-gray-600" />
                <p className="text-[10px] text-gray-600 leading-tight">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-black text-gray-900 mb-6">YOU MAY ALSO LIKE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
