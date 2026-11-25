'use client';

import { useEffect, useState } from 'react';
import type { AttributeOption } from '@/lib/admin/productOptions';

const OTHER = '__other__';
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

/** Dropdown of admin-managed options, with "Other…" for typing a new value. */
export default function AttributeSelect({
  label, options, value, onChange,
}: {
  label: string;
  options: AttributeOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const inList = (v: string) => options.some((o) => o.value.toLowerCase() === v.toLowerCase());
  const [typing, setTyping] = useState(() => !!value && !inList(value));

  // Options arrive after the first render; re-evaluate once they do.
  useEffect(() => {
    if (value && options.length) setTyping(!inList(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return (
    <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
      <label className="block">
        {label}
        <select
          aria-label={label}
          value={typing ? OTHER : options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.value ?? ''}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setTyping(true);
              onChange('');
            } else {
              setTyping(false);
              onChange(e.target.value);
            }
          }}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-1"
          style={field}
        >
          <option value="">— Not set —</option>
          {options.map((o) => <option key={o.id} value={o.value}>{o.value}</option>)}
          <option value={OTHER}>Other…</option>
        </select>
      </label>
      {typing && (
        <input
          aria-label={`${label} (type your own)`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Type ${label.toLowerCase()} — it will be added to the list`}
          maxLength={60}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mt-2"
          style={field}
        />
      )}
    </div>
  );
}
