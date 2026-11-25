'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListPlus, X } from 'lucide-react';
import { PRODUCT_ATTRIBUTES, emptyOptions, type OptionsByAttribute, type ProductAttribute } from '@/lib/admin/productOptions';

const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

/** Admin → Settings: manage the dropdown choices used in the product form. */
export default function ProductOptionsCard() {
  const [options, setOptions] = useState<OptionsByAttribute>(emptyOptions());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/product-options');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Could not load options.'); return; }
    setOptions(data.options);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (attribute: ProductAttribute) => {
    const value = (drafts[attribute] ?? '').trim();
    if (!value) return;
    setError('');
    const res = await fetch('/api/admin/product-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attribute, value }),
    });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Could not add option.'); return; }
    setDrafts((d) => ({ ...d, [attribute]: '' }));
    load();
  };

  const remove = async (id: string) => {
    setError('');
    const res = await fetch(`/api/admin/product-options?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) { setError('Could not remove option.'); return; }
    load();
  };

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold inline-flex items-center gap-2"><ListPlus size={16} /> Product dropdown options</h2>
      <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
        These are the choices in the product form. Values typed with &ldquo;Other…&rdquo; are added here automatically.
        Removing an option does not change existing products.
      </p>
      {error && <p role="alert" className="text-sm font-semibold mt-3" style={{ color: '#ef4444' }}>{error}</p>}
      <div className="mt-4 grid md:grid-cols-2 gap-5">
        {PRODUCT_ATTRIBUTES.map(({ key, label }) => (
          <div key={key}>
            <p className="text-sm font-semibold mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {options[key].length === 0 && <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>No options yet</span>}
              {options[key].map((o) => (
                <span key={o.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs" style={field}>
                  {o.value}
                  <button onClick={() => remove(o.id)} aria-label={`Remove ${o.value} from ${label}`} className="p-0.5 rounded-full hover:opacity-70"><X size={11} /></button>
                </span>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(key); }}>
              <input aria-label={`New ${label} option`} value={drafts[key] ?? ''} maxLength={60}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                placeholder={`Add ${label.toLowerCase()}…`} className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none" style={field} />
              <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Add</button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
