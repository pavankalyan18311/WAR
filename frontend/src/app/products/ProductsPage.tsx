'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, Check, Plus, Minus } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import ProductRail from '@/components/product/ProductRail';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { getProducts, getBestSellers, getCollections, getCategories, getColors, getSizeOptions } from '@/lib/supabase/queries';
import type { Product, Category, Color, SizeOption } from '@/types';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

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
  categories: string[];
  collections: string[];
  priceMax: number;
}

const MANAGED_QUERY_KEYS = ['category', 'categories', 'collections', 'sizes', 'colors', 'priceMax', 'sort'] as const;

function canonicalizeQuery(query: string): string {
  const pairs = Array.from(new URLSearchParams(query).entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort();
  return pairs.join('&');
}

function FilterSection({ title, open, onToggle, children, count = 0 }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; count?: number }) {
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
          {title}
          {count > 0 && <span className="ui-chip ui-chip-brand !py-0 !px-2 !text-[11px]">{count}</span>}
        </span>
        {open ? <Minus size={15} style={{ color: 'var(--fg-muted)' }} /> : <Plus size={15} style={{ color: 'var(--fg-muted)' }} />}
      </button>
      {open && <div className="pb-5">{children}</div>}
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

  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbColors, setDbColors] = useState<Color[]>([]);
  const [dbSizes, setDbSizes] = useState<SizeOption[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  const [filters, setFilters] = useState<Filters>({ sizes: [], colors: [], categories: [], collections: [], priceMax: 5000 });
  const [sort, setSort] = useState('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ category: true, collections: false, size: true, color: true, price: true });
  const searchTerm = searchParams.get('search') ?? '';
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [salesRank, setSalesRank] = useState<string[]>([]);

  useEffect(() => {
    getBestSellers(100).then((list: any[]) => setSalesRank(list.map((p) => p.id))).catch(() => {});
  }, []);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const recentlyViewed = useRecentlyViewedStore((s) => s.items);

  // Fetch dynamic metadata from database (categories, colors, sizes, collections)
  useEffect(() => {
    let mounted = true;
    Promise.all([getCategories(), getColors(), getSizeOptions(), getCollections()])
      .then(([cats, cols, szs, colles]) => {
        if (!mounted) return;
        setDbCategories(cats);
        setDbColors(cols);
        setDbSizes(szs);
        setCollections(colles);
      })
      .catch((err) => console.error('Error fetching filter options:', err));
    return () => { mounted = false; };
  }, []);

  // Deduplicate category names cleanly
  const categoryNamesList = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    dbCategories.forEach((c) => {
      if (c.name && !uniqueMap.has(c.name.toLowerCase().trim())) {
        uniqueMap.set(c.name.toLowerCase().trim(), c.name.trim());
      }
    });
    return ['All', ...Array.from(uniqueMap.values())];
  }, [dbCategories]);

  // Deduplicate colors cleanly
  const uniqueColorsList = useMemo(() => {
    const uniqueMap = new Map<string, Color>();
    dbColors.forEach((c) => {
      if (c.name && !uniqueMap.has(c.name.toLowerCase().trim())) {
        uniqueMap.set(c.name.toLowerCase().trim(), c);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dbColors]);

  // Deduplicate sizes cleanly
  const uniqueSizesList = useMemo(() => {
    const uniqueMap = new Map<string, SizeOption>();
    dbSizes.forEach((s) => {
      if (s.name && !uniqueMap.has(s.name.toUpperCase().trim())) {
        uniqueMap.set(s.name.toUpperCase().trim(), s);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dbSizes]);

  const getCategoriesFromQuery = useCallback((value: string | null) => {
    if (!value || value.toLowerCase() === 'all') return [];
    const items = value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return items.map((val) => {
      const exact = categoryNamesList.find((cat) => cat.toLowerCase() === val);
      if (exact) return exact;
      const bySlug = dbCategories.find((cat) => cat.slug.toLowerCase() === val);
      return bySlug ? bySlug.name : val;
    }).filter((cat) => cat !== 'All');
  }, [categoryNamesList, dbCategories]);

  const arraysEqual = useCallback((a: string[], b: string[]) => (
    a.length === b.length && a.every((item, i) => item === b[i])
  ), []);

  // Read filter state from URL
  useEffect(() => {
    syncingFromUrlRef.current = true;
    const params = new URLSearchParams(searchParamsString);
    const catQuery = params.get('category') || params.get('categories');
    const nextFilters: Filters = {
      sizes: (params.get('sizes') ?? '').split(',').filter(Boolean),
      colors: (params.get('colors') ?? '').split(',').filter(Boolean),
      categories: getCategoriesFromQuery(catQuery),
      collections: (params.get('collections') ?? '').split(',').filter(Boolean),
      priceMax: Number(params.get('priceMax') ?? 5000),
    };
    if (!Number.isFinite(nextFilters.priceMax)) nextFilters.priceMax = 5000;
    const nextSort = params.get('sort') ?? 'featured';

    setFilters((prev) => {
      const same =
        arraysEqual(prev.sizes, nextFilters.sizes) &&
        arraysEqual(prev.colors, nextFilters.colors) &&
        arraysEqual(prev.categories, nextFilters.categories) &&
        arraysEqual(prev.collections, nextFilters.collections) &&
        prev.priceMax === nextFilters.priceMax;
      return same ? prev : nextFilters;
    });

    setSort((prev) => (prev === nextSort ? prev : nextSort));
    didHydrateFromUrlRef.current = true;
    syncingFromUrlRef.current = false;
  }, [searchParamsString, getCategoriesFromQuery, arraysEqual]);

  // Sync state to URL params
  useEffect(() => {
    if (!didHydrateFromUrlRef.current || syncingFromUrlRef.current) return;

    const currentParams = new URLSearchParams(searchParamsString);
    const newParams = new URLSearchParams();

    currentParams.forEach((val, key) => {
      if (!MANAGED_QUERY_KEYS.includes(key as any)) {
        newParams.set(key, val);
      }
    });

    if (filters.categories.length > 0) newParams.set('categories', filters.categories.join(','));
    if (filters.collections.length > 0) newParams.set('collections', filters.collections.join(','));
    if (filters.sizes.length > 0) newParams.set('sizes', filters.sizes.join(','));
    if (filters.colors.length > 0) newParams.set('colors', filters.colors.join(','));
    if (filters.priceMax < 5000) newParams.set('priceMax', String(filters.priceMax));
    if (sort !== 'featured') newParams.set('sort', sort);

    const canonicalCurrent = canonicalizeQuery(searchParamsString);
    const canonicalNext = canonicalizeQuery(newParams.toString());

    if (canonicalCurrent !== canonicalNext && lastReplacedQueryRef.current !== canonicalNext) {
      lastReplacedQueryRef.current = canonicalNext;
      const targetUrl = canonicalNext ? `${pathname}?${canonicalNext}` : pathname;
      router.replace(targetUrl, { scroll: false });
    }
  }, [filters, sort, pathname, router, searchParamsString]);

  // Fetch products from database
  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    getProducts({ search: searchTerm })
      .then((prods) => {
        if (mounted) {
          setAllProducts(prods);
          setLoadingProducts(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        if (mounted) setLoadingProducts(false);
      });
    return () => { mounted = false; };
  }, [searchTerm]);

  const toggleSize = useCallback((sz: string) => {
    setFilters((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(sz) ? prev.sizes.filter((s) => s !== sz) : [...prev.sizes, sz],
    }));
  }, []);

  const toggleColor = useCallback((col: string) => {
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(col) ? prev.colors.filter((c) => c !== col) : [...prev.colors, col],
    }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    if (cat === 'All') {
      setFilters((prev) => ({ ...prev, categories: [] }));
      return;
    }
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat) ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ sizes: [], colors: [], categories: [], collections: [], priceMax: 5000 });
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    if (filters.categories.length > 0) {
      list = list.filter((p) =>
        p.categories?.some((c) => filters.categories.some((fc) => fc.toLowerCase() === c.name.toLowerCase())) ||
        (p.category && filters.categories.some((fc) => fc.toLowerCase() === p.category!.name.toLowerCase()))
      );
    }

    if (filters.collections.length > 0) {
      const selectedIds = collections.filter((c: any) => filters.collections.includes(c.slug)).map((c: any) => c.id);
      list = list.filter((p: any) => p.collection_ids?.some((id: string) => selectedIds.includes(id)));
    }

    if (filters.sizes.length > 0) {
      list = list.filter((p) =>
        p.sizes?.some((s) => filters.sizes.some((fs) => fs.toLowerCase() === s.name.toLowerCase())) ||
        p.variants?.some((v) => v.size && filters.sizes.some((fs) => fs.toLowerCase() === v.size!.toLowerCase()))
      );
    }

    if (filters.colors.length > 0) {
      list = list.filter((p) =>
        p.colors?.some((c) => filters.colors.some((fc) => fc.toLowerCase() === c.name.toLowerCase())) ||
        p.variants?.some((v) => v.color && filters.colors.some((fc) => fc.toLowerCase() === v.color!.toLowerCase()))
      );
    }

    if (filters.priceMax < 5000) {
      list = list.filter((p) => p.price <= filters.priceMax);
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'popular':
        // Best sellers first (by units sold), then the rest
        list.sort((a, b) => {
          const ra = salesRank.indexOf(a.id), rb = salesRank.indexOf(b.id);
          return (ra === -1 ? Infinity : ra) - (rb === -1 ? Infinity : rb);
        });
        break;
      default:
        break;
    }

    return list;
  }, [allProducts, filters, sort, collections, salesRank]);

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    filters.categories.length +
    filters.collections.length +
    (filters.priceMax < 5000 ? 1 : 0);

  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...filters.categories.map((c) => ({ key: `cat-${c}`, label: c, clear: () => toggleCategory(c) })),
    ...filters.collections.map((slug) => ({
      key: `col-${slug}`,
      label: collections.find((c: any) => c.slug === slug)?.name ?? slug,
      clear: () => setFilters((p) => ({ ...p, collections: p.collections.filter((s) => s !== slug) })),
    })),
    ...filters.sizes.map((s) => ({ key: `size-${s}`, label: `Size ${s}`, clear: () => toggleSize(s) })),
    ...filters.colors.map((c) => ({ key: `color-${c}`, label: c, clear: () => toggleColor(c) })),
    ...(filters.priceMax < 5000
      ? [{ key: 'price', label: `Under ₹${filters.priceMax.toLocaleString('en-IN')}`, clear: () => setFilters((p) => ({ ...p, priceMax: 5000 })) }]
      : []),
  ];

  const checkRow = (active: boolean, label: React.ReactNode, onClick: () => void, key: string, swatch?: string, testId?: string) => (
    <button key={key} type="button" onClick={onClick} aria-pressed={active} data-testid={testId}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[var(--surface-2)]"
      style={{ background: active ? 'var(--brand-soft)' : undefined }}>
      <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors"
        style={{ background: active ? 'var(--brand)' : 'transparent', borderColor: active ? 'var(--brand)' : 'var(--border-strong)' }}>
        {active && <Check size={12} strokeWidth={3.5} style={{ color: 'var(--brand-fg)' }} />}
      </span>
      {swatch && <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: swatch, boxShadow: 'inset 0 0 0 1px var(--border-strong)' }} />}
      <span className="text-sm flex-1" style={{ color: active ? 'var(--brand)' : 'var(--fg)', fontWeight: active ? 700 : 500 }}>
        {label}
      </span>
    </button>
  );

  const slug = (v: string) => v.toLowerCase().trim().replace(/\s+/g, '-');

  const filterSidebar = (
    <div>
      <FilterSection title="Category" count={filters.categories.length} open={openSections.category} onToggle={() => setOpenSections((v) => ({ ...v, category: !v.category }))}>
        <div className="space-y-0.5">
          {categoryNamesList.map((catName) =>
            checkRow(catName === 'All' ? filters.categories.length === 0 : filters.categories.includes(catName), catName, () => toggleCategory(catName), catName, undefined, `filter-category-${slug(catName)}`))}
        </div>
      </FilterSection>

      {collections.length > 0 && (
        <FilterSection title="Collection" count={filters.collections.length} open={openSections.collections} onToggle={() => setOpenSections((v) => ({ ...v, collections: !v.collections }))}>
          <div className="space-y-0.5">
            {collections.map((c: any) => checkRow(filters.collections.includes(c.slug), c.name, () => setFilters((p) => ({
              ...p,
              collections: p.collections.includes(c.slug) ? p.collections.filter((s) => s !== c.slug) : [...p.collections, c.slug],
            })), c.id))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Size" count={filters.sizes.length} open={openSections.size} onToggle={() => setOpenSections((v) => ({ ...v, size: !v.size }))}>
        <div className="flex flex-wrap gap-2">
          {uniqueSizesList.map((sz) => {
            const active = filters.sizes.includes(sz.name);
            return (
              <button key={sz.id} type="button" onClick={() => toggleSize(sz.name)} aria-pressed={active}
                className="min-w-[2.9rem] h-10 px-3 rounded-full text-sm font-semibold border-2 transition-colors"
                style={{
                  background: active ? 'var(--brand)' : 'var(--surface)',
                  color: active ? 'var(--brand-fg)' : 'var(--fg)',
                  borderColor: active ? 'var(--brand)' : 'var(--border)',
                }}>
                {sz.name}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {uniqueColorsList.length > 0 && (
        <FilterSection title="Colour" count={filters.colors.length} open={openSections.color} onToggle={() => setOpenSections((v) => ({ ...v, color: !v.color }))}>
          <div className="space-y-0.5">
            {uniqueColorsList.map((col) => checkRow(filters.colors.includes(col.name), col.name, () => toggleColor(col.name), col.id, col.color_code || undefined))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Max price" count={filters.priceMax < 5000 ? 1 : 0} open={openSections.price} onToggle={() => setOpenSections((v) => ({ ...v, price: !v.price }))}>
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Up to</span>
            <span className="text-lg font-extrabold" style={{ color: 'var(--brand)' }}>{filters.priceMax >= 5000 ? 'Any price' : `₹${filters.priceMax.toLocaleString('en-IN')}`}</span>
          </div>
          <input type="range" min={500} max={5000} step={100} value={filters.priceMax} aria-label="Maximum price"
            onChange={(e) => setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))}
            className="w-full cursor-pointer" style={{ accentColor: 'var(--brand)' }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>
            <span>₹500</span><span>₹5,000+</span>
          </div>
        </div>
      </FilterSection>
    </div>
  );

  const heading = searchTerm ? `“${searchTerm}”` : filters.categories.length === 1 ? filters.categories[0] : 'All Products';

  return (
    <div className="ui-page w-full min-h-[80vh]">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8 pb-20">
        {/* Header */}
        <div className="ui-card px-5 sm:px-7 py-6 mb-6">
          <span className="ui-chip ui-chip-brand mb-3">{searchTerm ? 'Search results' : 'The shop'}</span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <h1 className="ui-heading" style={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, color: 'var(--fg)' }}>{heading}</h1>
              <p className="text-sm mt-2 font-medium" style={{ color: 'var(--fg-muted)' }}>
                Showing {filteredProducts.length} items
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden ui-btn-ghost !py-2.5 !px-4 !rounded-full !text-sm">
                <SlidersHorizontal size={15} />
                Filters
                {activeFilterCount > 0 && <span className="ui-chip !py-0 !px-2 !text-[11px]" style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}>{activeFilterCount}</span>}
              </button>
              <label className="relative inline-flex items-center">
                <span className="sr-only">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="appearance-none h-11 pl-4 pr-10 rounded-full border-2 text-sm font-semibold outline-none cursor-pointer focus:border-[var(--brand)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--surface)' }}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5" style={{ color: 'var(--fg-muted)' }} />
              </label>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {activeChips.map((chip) => (
                <button key={chip.key} type="button" onClick={chip.clear} aria-label={`Remove filter ${chip.label}`}
                  className="ui-chip ui-chip-brand !py-1.5 !px-3 transition-opacity hover:opacity-80">
                  {chip.label} <X size={13} strokeWidth={2.5} />
                </button>
              ))}
              <button type="button" onClick={resetFilters} className="ui-link text-sm ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Sidebar + grid */}
        <div className="flex gap-6 lg:gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-28 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto ui-card px-4 py-1 [scrollbar-width:thin]">
            {filterSidebar}
            {activeFilterCount > 0 && (
              <button type="button" onClick={resetFilters} className="ui-btn-ghost w-full !py-2.5 !text-sm my-4">
                Clear All Filters ({activeFilterCount})
              </button>
            )}
          </aside>

          <main className="flex-1 min-w-0">
            {loadingProducts ? (
              <ProductGridSkeleton count={9} />
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id || product.product_id} product={product} />
                ))}
              </div>
            ) : (
              <div className="ui-card py-20 px-6 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  <SlidersHorizontal size={26} />
                </div>
                <p className="ui-heading text-2xl mb-2" style={{ color: 'var(--fg)' }}>No products found</p>
                <p className="text-[15px] mb-7" style={{ color: 'var(--fg-muted)' }}>Try adjusting your filters or search criteria.</p>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={resetFilters} className="ui-btn">Clear All Filters</button>
                ) : (
                  <a href="/products" className="ui-btn">Browse everything</a>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Saved in the browser, so only shown after mount (loading finished) to avoid a hydration mismatch. */}
        <ProductRail eyebrow="Your history" title="Recently viewed" products={loadingProducts ? [] : recentlyViewed} limit={10} />
      </div>

      {/* Mobile filter sheet — portal so the page transition's transform can't trap it */}
      {mobileFiltersOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex lg:hidden">
          <div className="fixed inset-0" style={{ background: 'rgba(22,20,18,0.5)' }} onClick={() => setMobileFiltersOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Filters"
            className="relative mt-auto w-full max-h-[88vh] flex flex-col rounded-t-3xl animate-fade-up"
            style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="ui-heading text-xl">Filters</h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="ui-link text-sm">Clear all</button>
                )}
                <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters"
                  className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5">{filterSidebar}</div>
            <div className="px-5 pt-3 pb-5 border-t" style={{ borderColor: 'var(--border)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="ui-btn w-full !py-4">
                Show {filteredProducts.length} results
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
