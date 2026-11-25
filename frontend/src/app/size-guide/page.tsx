import type { Metadata } from 'next';
import { Ruler } from 'lucide-react';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import SizeChartTable from '@/components/product/SizeChartTable';
import type { SizeChart } from '@/lib/sizeCharts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Size Guide — WAR' };

async function loadCharts(): Promise<SizeChart[]> {
  const { data, error } = await getServiceClient()
    .from('size_charts')
    .select('id, name, unit, columns, rows, note, is_default')
    .order('is_default', { ascending: false })
    .order('name');
  if (error) console.error('Size guide: could not load charts', error);
  return data ?? [];
}

const MEASURE = [
  { label: 'Chest', tip: 'Lay your best-fitting tee flat. Measure straight across just below the armholes, then double it.' },
  { label: 'Length', tip: 'From the highest point of the shoulder straight down to the hem.' },
  { label: 'Shoulder', tip: 'Straight across the back, from one shoulder seam to the other.' },
  { label: 'Sleeve', tip: 'From the shoulder seam to the end of the sleeve.' },
];

/** /size-guide — every size chart the admin has set up, plus how to measure. */
export default async function SizeGuidePage() {
  const charts = await loadCharts();

  return (
    <div className="ui-page w-full">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-8 pb-20">
        <header className="ui-card px-5 sm:px-8 py-7 mb-6">
          <span className="ui-chip ui-chip-brand mb-3">Fit &amp; sizing</span>
          <h1 className="ui-heading mb-3" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', lineHeight: 1.02 }}>Size guide</h1>
          <p className="text-[15px] max-w-xl" style={{ color: 'var(--fg-muted)' }}>
            All measurements are of the garment itself, laid flat. Compare them with a tee you already love to find your size.
          </p>
        </header>

        {charts.length === 0 ? (
          <div className="ui-card px-6 py-12 text-center">
            <p className="ui-heading text-xl" style={{ color: 'var(--fg-muted)' }}>Size charts are coming soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {charts.map((chart) => (
              <section key={chart.id} className="ui-card px-4 sm:px-7 py-6">
                <h2 className="ui-heading text-xl sm:text-2xl mb-4">{chart.name}</h2>
                <div className="overflow-x-auto">
                  <SizeChartTable chart={chart} />
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="ui-card px-5 sm:px-8 py-7 mt-6">
          <h2 className="ui-heading text-xl sm:text-2xl mb-5 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <Ruler size={17} />
            </span>
            How to measure
          </h2>
          <dl className="grid sm:grid-cols-2 gap-3">
            {MEASURE.map(({ label, tip }) => (
              <div key={label} className="ui-card-soft px-4 py-4">
                <dt className="text-sm font-bold mb-1" style={{ color: 'var(--brand)' }}>{label}</dt>
                <dd className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{tip}</dd>
              </div>
            ))}
          </dl>
          <p className="ui-chip ui-chip-info mt-5">Between sizes? Pick the larger one for a roomier fit.</p>
        </section>
      </div>
    </div>
  );
}
