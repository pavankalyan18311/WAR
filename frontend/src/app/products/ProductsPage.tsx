'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { getProducts, getCollections, getCategories, getColors, getSizeOptions } from '@/lib/supabase/queries';
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

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left cursor-pointer">
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
  const [loadingProducts, setLoadingProducts] = useState(true);

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
      list = list.filter((p) =>
        filters.collections.some((colSlug) => p.slug.includes(colSlug) || p.name.toLowerCase().includes(colSlug.toLowerCase()))
      );
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
        list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      default:
        break;
    }

    return list;
  }, [allProducts, filters, sort]);

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    filters.categories.length +
    filters.collections.length +
    (filters.priceMax < 5000 ? 1 : 0);

  const filterSidebar = (
    <div className="space-y-1">
      {/* Category Section — One By One Vertical List with Custom Modern Checkboxes */}
      <FilterSection title="Category" open={openSections.category} onToggle={() => setOpenSections((v) => ({ ...v, category: !v.category }))}>
        <div className="space-y-1 pt-1">
          {categoryNamesList.map((catName) => {
            const active = catName === 'All' ? filters.categories.length === 0 : filters.categories.includes(catName);
            return (
              <div
                key={catName}
                onClick={() => toggleCategory(catName)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150 group select-none hover:bg-[var(--bg-elevated)]"
              >
                {/* Custom Modern Styled Checkbox */}
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150 flex-shrink-0"
                  style={{
                    background: active ? 'var(--primary)' : 'transparent',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {active && <Check size={11} style={{ color: 'var(--primary-fg)', strokeWidth: 3 }} />}
                </div>
                <span
                  className="text-xs transition-colors duration-150 flex-1"
                  style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {catName}
                </span>
              </div>
            );
          })}
        </div>
      </FilterSection>

      {/* Size Section — Modern Custom Square Checkboxes */}
      <FilterSection title="Size" open={openSections.size} onToggle={() => setOpenSections((v) => ({ ...v, size: !v.size }))}>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {uniqueSizesList.map((sz) => {
            const active = filters.sizes.includes(sz.name);
            return (
              <button
                key={sz.id}
                onClick={() => toggleSize(sz.name)}
                className="w-10 h-10 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer"
                style={{
                  background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: active ? 'var(--primary-fg)' : 'var(--fg)',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {sz.name}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Colour Section — One By One Vertical List with Color Swatches & Custom Checkboxes */}
      <FilterSection title="Colour" open={openSections.color} onToggle={() => setOpenSections((v) => ({ ...v, color: !v.color }))}>
        <div className="space-y-1 pt-1">
          {uniqueColorsList.map((col) => {
            const active = filters.colors.includes(col.name);
            const hex = col.color_code || '#000000';
            return (
              <div
                key={col.id}
                onClick={() => toggleColor(col.name)}
                className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150 select-none hover:bg-[var(--bg-elevated)]"
              >
                {/* Custom Modern Styled Checkbox */}
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150 flex-shrink-0"
                  style={{
                    background: active ? 'var(--primary)' : 'transparent',
                    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {active && <Check size={11} style={{ color: 'var(--primary-fg)', strokeWidth: 3 }} />}
                </div>
                <span className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0" style={{ background: hex }} />
                <span
                  className="text-xs transition-colors duration-150 flex-1"
                  style={{
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {col.name}
                </span>
              </div>
            );
          })}
        </div>
      </FilterSection>

      {/* Price Section */}
      <FilterSection title="Max Price" open={openSections.price} onToggle={() => setOpenSections((v) => ({ ...v, price: !v.price }))}>
        <div className="pt-2 px-1">
          <div className="flex justify-between text-xs mb-2 font-mono" style={{ color: 'var(--fg-muted)' }}>
            <span>₹500</span>
            <span className="font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-elevated)', color: 'var(--fg)' }}>₹{filters.priceMax.toLocaleString()}</span>
            <span>₹5,000</span>
          </div>
          <input type="range" min={500} max={5000} step={100} value={filters.priceMax}
            onChange={(e) => setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))}
            className="w-full accent-black cursor-pointer" />
        </div>
      </FilterSection>

      {activeFilterCount > 0 && (
        <button onClick={resetFilters} className="w-full py-2.5 mt-4 text-xs font-bold uppercase tracking-wider text-red-500 hover:underline text-center cursor-pointer">
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--fg)' }}>
            {searchTerm ? `Search: "${searchTerm}"` : filters.categories.length === 1 ? filters.categories[0] : 'All Products'}
          </h1>
          <p className="text-xs mt-1 font-mono uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>
            Showing {filteredProducts.length} items
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Mobile Filter Toggle */}
          <button onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            <SlidersHorizontal size={14} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {/* Sort Dropdown */}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid + Sidebar */}
      <div className="flex gap-10">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-24 h-fit max-h-[85vh] overflow-y-auto pr-2">
          {filterSidebar}
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          {loadingProducts ? (
            <ProductGridSkeleton count={9} />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id || product.product_id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>No products found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Try adjusting your filters or search criteria.</p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters}
                  className="mt-4 px-4 py-2 text-xs font-bold rounded-xl"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs h-full p-6 overflow-y-auto flex flex-col justify-between"
            style={{ background: 'var(--bg-card)', color: 'var(--fg)' }}>
            <div>
              <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-sm font-black uppercase tracking-wider">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)}><X size={18} /></button>
              </div>
              {filterSidebar}
            </div>
            <button onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl mt-6"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Apply Filters ({filteredProducts.length} Results)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
