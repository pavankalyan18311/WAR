'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Clock } from 'lucide-react';
import type { SearchResult } from '@/lib/search';

const RECENT_KEY = 'war-recent-searches';
const DEBOUNCE_MS = 250;

function readRecent(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}
function rememberSearch(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}

/** Header search: live product suggestions, keyboard navigation, recent searches. */
export default function SearchOverlay({ open, onClose, categories }: {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Debounced lookup; ignores answers to older queries.
  useEffect(() => {
    const q = query.trim();
    setActive(-1);
    if (q.length < 2) { setResults(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { results: [] };
        if (!cancelled) setResults(data.results ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  if (!open) return null;

  const close = () => { setQuery(''); setResults(null); onClose(); };
  const go = (href: string) => { router.push(href); close(); };
  const searchAll = (q: string) => {
    const term = q.trim();
    if (!term) return;
    rememberSearch(term);
    go(`/products?search=${encodeURIComponent(term)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const count = results?.length ?? 0;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown' && count) { e.preventDefault(); setActive((i) => (i + 1) % count); }
    else if (e.key === 'ArrowUp' && count) { e.preventDefault(); setActive((i) => (i <= 0 ? count - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0 && results?.[active]) {
      e.preventDefault();
      rememberSearch(query.trim());
      go(`/products/${results[active].slug}`);
    }
  };

  const q = query.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24 px-4"
      style={{ background: 'rgba(22,20,18,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-2xl animate-fade-up"
        style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}>
        <form onSubmit={(e) => { e.preventDefault(); searchAll(query); }}
          className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border-strong)' }}>
          <Search size={18} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
          <input data-testid="header-search-input" ref={inputRef} type="text" inputMode="search" value={query}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            role="combobox" aria-expanded={!!results?.length} aria-controls="search-results" aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
            placeholder="Search t-shirts, styles, colours..." autoComplete="off" enterKeyHint="search"
            className="flex-1 text-lg font-display bg-transparent" style={{ color: 'var(--fg)', outline: 'none' }} />
          {loading && <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--fg-subtle)' }} aria-hidden />}
          <button type="button" onClick={close} aria-label="Close search" className="p-1" style={{ color: 'var(--fg-subtle)' }}>
            <X size={18} />
          </button>
        </form>

        <div className="max-h-[65vh] overflow-y-auto">
          {q.length < 2 ? (
            <div className="px-5 py-5 space-y-5">
              {recent.length > 0 && (
                <div>
                  <p className="eyebrow mb-3">Recent searches</p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} type="button" onClick={() => searchAll(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors hover:border-[var(--fg)]"
                        style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                        <Clock size={11} style={{ color: 'var(--fg-subtle)' }} /> {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {categories.length > 0 && (
                <div>
                  <p className="eyebrow mb-3">Shop by category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(({ id, name }) => (
                      <button key={id} type="button" onClick={() => go(`/products?category=${encodeURIComponent(name)}`)}
                        className="px-3 py-1.5 text-xs border transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                        style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : results && results.length === 0 && !loading ? (
            <div className="px-5 py-10 text-center">
              <p className="font-display text-xl">No matches for &ldquo;{q}&rdquo;</p>
              <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
                Try{' '}
                <button type="button" className="link-rule" onClick={() => setQuery('oversized')}>oversized</button>{' '}or{' '}
                <button type="button" className="link-rule" onClick={() => setQuery('black')}>black</button>.
              </p>
            </div>
          ) : results ? (
            <>
              <ul id="search-results" role="listbox" aria-label="Matching products">
                {results.map((r, i) => (
                  <li key={r.id} id={`search-option-${i}`} role="option" aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { rememberSearch(q); go(`/products/${r.slug}`); }}
                    className="flex items-center gap-4 px-5 py-3 cursor-pointer border-b"
                    style={{ borderColor: 'var(--border)', background: i === active ? 'var(--bg-elevated)' : undefined }}>
                    <div className="relative w-12 aspect-[4/5] flex-shrink-0 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      {r.image && <Image src={r.image} alt="" fill sizes="48px" className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--fg)' }}>{r.name}</p>
                      {r.category && <p className="text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{r.category}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <Link href={`/products?search=${encodeURIComponent(q)}`} onClick={() => { rememberSearch(q); close(); }}
                className="flex items-center justify-between px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] hover:bg-[var(--bg-elevated)]">
                View all results for &lsquo;{q}&rsquo; <ArrowRight size={14} />
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
