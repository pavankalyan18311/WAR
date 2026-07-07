'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { MOCK_PRODUCTS, COLLECTIONS, getProductsForCollection, getCollectionBySlug } from '@/lib/mockData';
import type { Product } from '@/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', hex: '#000' }, { name: 'White', hex: '#fff' },
  { name: 'Navy', hex: '#1e3a5f' }, { name: 'Grey', hex: '#9ca3af' },
  { name: 'Red', hex: '#ef4444' }, { name: 'Green', hex: '#22c55e' },
];
const CATEGORIES_FILTER = ['All', 'Oversized', 'Graphic', 'Plain', 'Polo', 'Premium'];
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
];

interface Filters {
  sizes: string[];
  colors: string[];
  category: string;
  collections: string[];
  priceMax: number;
}

const MANAGED_QUERY_KEYS = ['category', 'collections', 'sizes', 'colors', 'priceMax', 'sort'] as const;

function canonicalizeQuery(query: string): string {
  const pairs = Array.from(new URLSearchParams(query).entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort();
  return pairs.join('&');
}

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--fg)' }}>{title}</span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--fg-subtle)' }} /> : <ChevronDown size={14} style={{ color: 'var(--fg-subtle)' }} />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const pathname = usePathname();
  const router = useRouter();
  const lastReplacedQueryRef = useRef<string>('');
  const didHydrateFromUrlRef = useRef(false);
  const syncingFromUrlRef = useRef(false);
  const [filters, setFilters] = useState<Filters>({ sizes: [], colors: [], category: 'All', collections: [], priceMax: 5000 });
  const [sort, setSort] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ category: true, collections: false, size: true, color: true, price: true });
  const searchTerm = searchParams.get('search') ?? '';

  const getCategoryFromQuery = useCallback((value: string | null) => {
    if (!value || value.toLowerCase() === 'all') return 'All';
    const normalized = value.toLowerCase();
    const exact = CATEGORIES_FILTER.find((cat) => cat.toLowerCase() === normalized);
    if (exact) return exact;
    const bySlug = CATEGORIES_FILTER.find((cat) => cat.toLowerCase().replace(/\s+/g, '-') === normalized);
    return bySlug ?? 'All';
  }, []);

  const arraysEqual = useCallback((a: string[], b: string[]) => (
    a.length === b.length && a.every((item, i) => item === b[i])
  ), []);

  // Read filter state from URL for deep links / refresh / browser back-forward.
  useEffect(() => {
    syncingFromUrlRef.current = true;
    const params = new URLSearchParams(searchParamsString);
    const nextFilters: Filters = {
      sizes: (params.get('sizes') ?? '').split(',').filter(Boolean),
      colors: (params.get('colors') ?? '').split(',').filter(Boolean),
      category: getCategoryFromQuery(params.get('category')),
      collections: (params.get('collections') ?? '').split(',').filter(Boolean),
      priceMax: Number(params.get('priceMax') ?? 5000),
    };
    if (!Number.isFinite(nextFilters.priceMax)) nextFilters.priceMax = 5000;
    const nextSort = params.get('sort') ?? 'featured';

    setFilters((prev) => {
      if (
        arraysEqual(prev.sizes, nextFilters.sizes) &&
        arraysEqual(prev.colors, nextFilters.colors) &&
        arraysEqual(prev.collections, nextFilters.collections) &&
        prev.category === nextFilters.category &&
        prev.priceMax === nextFilters.priceMax
      ) {
        return prev;
      }
      return nextFilters;
    });

    setSort((prev) => (prev === nextSort ? prev : nextSort));
    lastReplacedQueryRef.current = searchParamsString;
    didHydrateFromUrlRef.current = true;
  }, [searchParamsString, getCategoryFromQuery, arraysEqual]);

  // Persist filter state into URL query params.
  useEffect(() => {
    if (!didHydrateFromUrlRef.current) return;
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }

    const params = new URLSearchParams(searchParamsString);

    MANAGED_QUERY_KEYS.forEach((key) => params.delete(key));

    if (filters.category !== 'All') params.set('category', filters.category.toLowerCase().replace(/\s+/g, '-'));

    if (filters.collections.length) params.set('collections', filters.collections.join(','));

    if (filters.sizes.length) params.set('sizes', filters.sizes.join(','));

    if (filters.colors.length) params.set('colors', filters.colors.join(','));

    if (filters.priceMax < 5000) params.set('priceMax', String(filters.priceMax));

    if (sort !== 'featured') params.set('sort', sort);

    if (searchTerm) params.set('search', searchTerm);

    const nextQuery = params.toString();
    const currentQuery = searchParamsString;
    const queryChanged = canonicalizeQuery(nextQuery) !== canonicalizeQuery(currentQuery);
    if (queryChanged && lastReplacedQueryRef.current !== nextQuery) {
      lastReplacedQueryRef.current = nextQuery;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [filters, sort, pathname, router, searchTerm, searchParamsString]);

  const toggleSection = (key: keyof typeof openSections) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  const toggleSize = (s: string) => setFilters((p) => ({ ...p, sizes: p.sizes.includes(s) ? p.sizes.filter((x) => x !== s) : [...p.sizes, s] }));
  const toggleColor = (c: string) => setFilters((p) => ({ ...p, colors: p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c] }));
  const toggleCollection = (slug: string) => setFilters((p) => ({ ...p, collections: p.collections.includes(slug) ? p.collections.filter((x) => x !== slug) : [...p.collections, slug] }));
  const clearFilters = useCallback(() => setFilters({ sizes: [], colors: [], category: 'All', collections: [], priceMax: 5000 }), []);

  const filtered = useMemo<Product[]>(() => {
    const search = searchTerm.toLowerCase();
    let results = MOCK_PRODUCTS.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search) && !p.description?.toLowerCase().includes(search)) return false;
      if (filters.category !== 'All') {
        const selected = filters.category.toLowerCase();
        const categoryName = p.category?.name.toLowerCase();
        const categorySlug = p.category?.slug?.toLowerCase();
        if (categoryName !== selected && categorySlug !== selected) return false;
      }
      if (filters.collections.length) {
        const inAny = filters.collections.some((slug) => {
          const col = getCollectionBySlug(slug);
          return col ? getProductsForCollection(col).some((cp) => cp.product_id === p.product_id) : false;
        });
        if (!inAny) return false;
      }
      if (filters.sizes.length && !p.variants?.some((v) => filters.sizes.includes(v.size))) return false;
      if (filters.colors.length && !p.variants?.some((v) => filters.colors.includes(v.color))) return false;
      if (p.price > filters.priceMax) return false;
      return true;
    });
    if (sort === 'price_asc') results = [...results].sort((a, b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price));
    if (sort === 'price_desc') results = [...results].sort((a, b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price));
    if (sort === 'popular') results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return results;
  }, [filters, sort, searchTerm]);

  const activeFilterCount = filters.sizes.length + filters.colors.length + filters.collections.length + (filters.category !== 'All' ? 1 : 0) + (filters.priceMax < 5000 ? 1 : 0);

  const FilterPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black tracking-[0.25em] uppercase" style={{ color: 'var(--fg)' }}>Filters</h2>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs font-semibold flex items-center gap-1 hover:opacity-70"
            style={{ color: 'var(--danger)' }}>
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      <FilterSection title="Collections" open={openSections.collections} onToggle={() => toggleSection('collections')}>
        <div className="space-y-2">
          {COLLECTIONS.map((col) => {
            const active = filters.collections.includes(col.slug);
            return (
              <button key={col.slug} onClick={() => toggleCollection(col.slug)}
                className="w-full flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    background: active ? 'var(--primary)' : 'transparent',
                  }}>
                  {active && (
                    <svg viewBox="0 0 10 8" width="10" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="var(--primary-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: active ? 700 : 400 }}>{col.name}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Category" open={openSections.category} onToggle={() => toggleSection('category')}>
        <div className="space-y-2">
          {CATEGORIES_FILTER.map((cat) => (
            <button key={cat} data-testid={`filter-category-${cat.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setFilters((p) => ({ ...p, category: cat }))}
              className="w-full flex items-center gap-3 text-sm">
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: filters.category === cat ? 'var(--primary)' : 'var(--border)',
                  background: filters.category === cat ? 'var(--primary)' : 'transparent',
                }}>
                {filters.category === cat && (
                  <svg viewBox="0 0 10 8" width="10" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="var(--primary-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ color: filters.category === cat ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: filters.category === cat ? 700 : 400 }}>{cat}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Size" open={openSections.size} onToggle={() => toggleSection('size')}>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => {
            const active = filters.sizes.includes(s);
            return (
              <button key={s} onClick={() => toggleSize(s)}
                className="w-10 h-10 text-xs font-bold rounded-lg transition-all"
                style={{
                  background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: active ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                }}>
                {s}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Colour" open={openSections.color} onToggle={() => toggleSection('color')}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(({ name, hex }) => {
            const active = filters.colors.includes(name);
            return (
              <button key={name} onClick={() => toggleColor(name)} title={name}
                className="w-7 h-7 rounded-full transition-all"
                style={{
                  background: hex,
                  outline: active ? `3px solid var(--primary)` : `2px solid var(--border)`,
                  outlineOffset: active ? '3px' : '2px',
                  boxShadow: name === 'White' ? 'inset 0 0 0 1px #d1d5db' : undefined,
                }}
                aria-label={name} />
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price" open={openSections.price} onToggle={() => toggleSection('price')}>
        <div>
          <div className="flex justify-between text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
            <span>Rs.0</span>
            <span style={{ color: 'var(--fg)', fontWeight: 700 }}>Up to Rs.{filters.priceMax}</span>
          </div>
          <input type="range" min={500} max={5000} step={100} value={filters.priceMax}
            onChange={(e) => setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: 'var(--primary)', background: 'var(--bg-elevated)' }}
          />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--fg)' }}>
            {searchTerm ? `Results for "${searchTerm}"` : 'All Products'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{filtered.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile filter toggle */}
          <button onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}>
            <SlidersHorizontal size={15} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {/* Sort */}
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="pl-3 pr-8 py-2.5 text-sm font-semibold rounded-xl cursor-pointer appearance-none outline-none"
              style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}>
              {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--fg-subtle)' }} />
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {filters.category !== 'All' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {filters.category}
              <button onClick={() => setFilters((p) => ({ ...p, category: 'All' }))} style={{ color: 'var(--fg-muted)' }}><X size={11} /></button>
            </span>
          )}
          {filters.collections.map((slug) => {
            const col = COLLECTIONS.find((c) => c.slug === slug);
            return col ? (
              <span key={slug} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                {col.name}
                <button onClick={() => toggleCollection(slug)} style={{ color: 'var(--fg-muted)' }}><X size={11} /></button>
              </span>
            ) : null;
          })}
          {filters.sizes.map((s) => (
            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              Size: {s}
              <button onClick={() => toggleSize(s)} style={{ color: 'var(--fg-muted)' }}><X size={11} /></button>
            </span>
          ))}
          {filters.colors.map((c) => (
            <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              {c}
              <button onClick={() => toggleColor(c)} style={{ color: 'var(--fg-muted)' }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-24 h-fit">
          <FilterPanel />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>No products found</p>
              <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>Try adjusting your filters.</p>
              <button onClick={clearFilters}
                className="px-6 py-2.5 rounded-full font-bold text-sm"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black" style={{ color: 'var(--fg)' }}>Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} style={{ color: 'var(--fg-muted)' }}><X size={20} /></button>
            </div>
            <FilterPanel />
            <button onClick={() => setMobileFiltersOpen(false)}
              className="w-full mt-5 py-3.5 rounded-full font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Show {filtered.length} Products
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
