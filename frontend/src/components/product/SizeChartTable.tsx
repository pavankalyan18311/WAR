'use client';

import { useState } from 'react';
import { convertMeasurement, type SizeChart, type SizeUnit } from '@/lib/sizeCharts';

/** A size chart as a table, with an inches / cm switch. */
export default function SizeChartTable({ chart, highlightSize }: { chart: SizeChart; highlightSize?: string | null }) {
  const [unit, setUnit] = useState<SizeUnit>(chart.unit);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="eyebrow">Measurements in {unit === 'in' ? 'inches' : 'cm'}</p>
        <div className="inline-flex border" style={{ borderColor: 'var(--border-strong)' }} role="group" aria-label="Unit">
          {(['in', 'cm'] as const).map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u}
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ background: unit === u ? 'var(--fg)' : 'transparent', color: unit === u ? 'var(--bg)' : 'var(--fg)' }}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-y" style={{ borderColor: 'var(--fg)' }}>
              <th className="text-left py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.16em]">Size</th>
              {chart.columns.map((c) => (
                <th key={c} className="text-left py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.16em]">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((r) => {
              const active = highlightSize === r.size;
              return (
                <tr key={r.size} aria-current={active ? 'true' : undefined} className="border-b"
                  style={{ borderColor: 'var(--border)', background: active ? 'var(--bg-elevated)' : undefined }}>
                  <td className="py-3 pr-4 font-semibold">{r.size}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="py-3 pr-4 tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      {convertMeasurement(v, chart.unit, unit) || '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chart.note && <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{chart.note}</p>}
    </div>
  );
}
