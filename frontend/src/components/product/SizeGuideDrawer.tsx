'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from 'lucide-react';
import SizeChartTable from '@/components/product/SizeChartTable';
import { chartForProduct, type SizeChart } from '@/lib/sizeCharts';

/** "Size guide" link on the product page; opens the product's size chart in a side panel. */
export default function SizeGuideDrawer({ sizeChartId, selectedSize }: { sizeChartId: string | null | undefined; selectedSize?: string | null }) {
  const [chart, setChart] = useState<SizeChart | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/size-charts')
      .then((r) => (r.ok ? r.json() : { charts: [] }))
      .then((d) => setChart(chartForProduct(d.charts ?? [], sizeChartId)))
      .catch(() => setChart(null));
  }, [sizeChartId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!chart) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="link-rule text-[11px] uppercase tracking-[0.16em]">
        Size guide
      </button>

      {/* Portal: the page wrapper animates with a transform, which would trap the panel under the header. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0" style={{ background: 'rgba(22,20,18,0.45)' }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Size guide"
            className="relative w-full max-w-lg h-full overflow-y-auto p-6 sm:p-8 animate-fade-in"
            style={{ background: 'var(--bg)' }}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="eyebrow mb-2">Size guide</p>
                <h2 className="text-3xl">{chart.name}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close size guide" className="p-1">
                <X size={20} />
              </button>
            </div>

            <SizeChartTable chart={chart} highlightSize={selectedSize} />

            <div className="mt-8 pt-6 border-t text-sm space-y-2" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-muted)' }}>
              <p className="eyebrow mb-3" style={{ color: 'var(--fg)' }}>How to measure</p>
              <p><strong style={{ color: 'var(--fg)' }}>Chest</strong> — lay your best-fitting tee flat and measure straight across, just below the armholes; double it.</p>
              <p><strong style={{ color: 'var(--fg)' }}>Length</strong> — from the highest point of the shoulder down to the hem.</p>
              <p><strong style={{ color: 'var(--fg)' }}>Shoulder</strong> — straight across the back, from one shoulder seam to the other.</p>
              <p className="pt-2">Between sizes? Pick the larger one for a roomier fit.</p>
            </div>

            <Link href="/size-guide" className="link-rule inline-block mt-6 text-[11px] uppercase tracking-[0.16em]">All size charts</Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
