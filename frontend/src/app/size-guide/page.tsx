'use client';

import { useState } from 'react';
import { Ruler, ChevronRight, RotateCcw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { recommendSize, type Measurements, type FitPreference, type SizeCode } from '@/lib/sizeRecommendation';
import ScrollReveal from '@/components/ui/ScrollReveal';

const SIZE_ORDER: SizeCode[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const FIT_OPTIONS: { value: FitPreference; label: string; desc: string; emoji: string }[] = [
  { value: 'slim',     label: 'Slim',     desc: 'Body hugging, clean silhouette', emoji: '🔥' },
  { value: 'regular',  label: 'Regular',  desc: 'Classic comfortable fit',        emoji: '👕' },
  { value: 'relaxed',  label: 'Relaxed',  desc: 'Easy, roomy through the chest',  emoji: '😌' },
  { value: 'oversized',label: 'Oversized',desc: 'Streetwear drop-shoulder look',  emoji: '🏀' },
];

const CONFIDENCE_CONFIG = {
  perfect:    { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',  icon: CheckCircle, label: 'Perfect Match' },
  good:       { color: '#d97706', bg: 'rgba(217,119,6,0.1)',  icon: Info,        label: 'Good Match' },
  borderline: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  icon: AlertCircle, label: 'Borderline — check alternates' },
};

type Step = 'form' | 'result';

export default function SizeGuidePage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<Measurements>({
    height: 170,
    weight: 65,
    chest: 92,
    shoulder: 43,
    fit: 'regular',
  });
  const [result, setResult] = useState<ReturnType<typeof recommendSize> | null>(null);

  const set = (k: keyof Measurements, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(recommendSize(form));
    setStep('result');
  };

  const reset = () => { setStep('form'); setResult(null); };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
          <ScrollReveal animation="fade-up">
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>
              Find Your Fit
            </p>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>
              Size Recommender
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              Enter your measurements and fit preference — we'll find your perfect size instantly.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        {step === 'form' ? (
          <ScrollReveal animation="fade-up">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Measurements */}
              <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                    <Ruler size={18} style={{ color: 'var(--fg)' }} />
                  </div>
                  <div>
                    <h2 className="font-bold" style={{ color: 'var(--fg)' }}>Your Measurements</h2>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Use a soft tape measure for accuracy</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <MeasurementInput
                    label="Height" unit="cm"
                    value={form.height} min={140} max={220}
                    hint="Stand straight without shoes"
                    onChange={(v) => set('height', v)}
                  />
                  <MeasurementInput
                    label="Weight" unit="kg"
                    value={form.weight} min={40} max={160}
                    hint="Used for cross-reference only"
                    onChange={(v) => set('weight', v)}
                  />
                  <MeasurementInput
                    label="Chest" unit="cm"
                    value={form.chest} min={60} max={150}
                    hint="Around the fullest part of your chest"
                    onChange={(v) => set('chest', v)}
                  />
                  <MeasurementInput
                    label="Shoulder" unit="cm"
                    value={form.shoulder} min={30} max={60}
                    hint="Point to point across your back"
                    onChange={(v) => set('shoulder', v)}
                  />
                </div>
              </div>

              {/* Fit preference */}
              <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h2 className="font-bold mb-1" style={{ color: 'var(--fg)' }}>Fit Preference</h2>
                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>How do you like your t-shirts to fit?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FIT_OPTIONS.map((opt) => {
                    const active = form.fit === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => set('fit', opt.value)}
                        className="rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                          border: active ? '2px solid var(--primary)' : '2px solid transparent',
                          color: active ? 'var(--primary-fg)' : 'var(--fg)',
                        }}
                      >
                        <div className="text-xl mb-2">{opt.emoji}</div>
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-xs mt-0.5 leading-tight" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--fg-muted)' }}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit"
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                Find My Size <ChevronRight size={18} />
              </button>

              {/* How we measure guide */}
              <HowToMeasure />
            </form>
          </ScrollReveal>
        ) : (
          result && <ResultView result={result} form={form} onReset={reset} />
        )}
      </div>
    </main>
  );
}

// ─── Measurement input ────────────────────────────────────────────────────────
function MeasurementInput({
  label, unit, value, min, max, hint, onChange,
}: {
  label: string; unit: string; value: number;
  min: number; max: number; hint: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>
        {label}
        <span className="ml-1 text-xs font-normal" style={{ color: 'var(--fg-muted)' }}>({unit})</span>
      </label>
      <div className="flex items-center gap-3">
        <button type="button"
          className="w-9 h-9 rounded-lg font-bold text-lg flex-shrink-0 flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <input
          type="number" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input-field text-center font-bold text-base"
          style={{ MozAppearance: 'textfield' } as React.CSSProperties}
        />
        <button type="button"
          className="w-9 h-9 rounded-lg font-bold text-lg flex-shrink-0 flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
      <p className="text-xs mt-1.5" style={{ color: 'var(--fg-subtle)' }}>{hint}</p>
    </div>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────
function ResultView({ result, form, onReset }: {
  result: ReturnType<typeof recommendSize>;
  form: Measurements;
  onReset: () => void;
}) {
  const conf = CONFIDENCE_CONFIG[result.confidence];
  const ConfIcon = conf.icon;

  return (
    <div className="space-y-5">
      {/* Main result */}
      <ScrollReveal animation="zoom-in">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--fg-muted)' }}>
            Your Recommended Size
          </p>
          <div
            className="inline-flex items-center justify-center w-32 h-32 rounded-full font-black mb-4"
            style={{
              fontSize: '2.5rem',
              background: 'var(--primary)',
              color: 'var(--primary-fg)',
              boxShadow: '0 0 0 8px var(--bg-elevated)',
            }}
          >
            {result.recommended}
          </div>

          {/* Confidence badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: conf.bg, color: conf.color }}>
            <ConfIcon size={13} /> {conf.label}
          </div>

          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
            {result.fitNote}
          </p>
        </div>
      </ScrollReveal>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Garment measurements */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--fg)' }}>Size {result.recommended} Garment Specs</h3>
            <div className="space-y-3">
              {[
                { label: 'Chest (garment)', value: result.measurements.chest },
                { label: 'Shoulder width', value: result.measurements.shoulder },
                { label: 'Length', value: result.measurements.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Alternates */}
        <ScrollReveal animation="fade-up" delay={150}>
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--fg)' }}>Also Consider</h3>
            <div className="space-y-3 mb-5">
              {result.alternates.map((size) => (
                <div key={size} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{size}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
                    {result.alternates.indexOf(size) === 0
                      ? 'If you prefer tighter'
                      : 'If you prefer looser'}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
              <strong style={{ color: 'var(--fg)' }}>Your measurements:</strong><br />
              Chest {form.chest} cm · Shoulder {form.shoulder} cm<br />
              Height {form.height} cm · Weight {form.weight} kg
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Size ladder */}
      <ScrollReveal animation="fade-up" delay={200}>
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--fg)' }}>Full Size Chart</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length'].map((h) => (
                    <th key={h} className="pb-2 text-left font-bold text-xs uppercase tracking-wider px-2"
                      style={{ color: 'var(--fg-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_ORDER.map((size) => {
                  const isRec = size === result.recommended;
                  const isAlt = result.alternates.includes(size);
                  const specs = {
                    XS:  { chest: '78–84', shoulder: '38–40', length: '67 cm' },
                    S:   { chest: '84–90', shoulder: '40–42', length: '69 cm' },
                    M:   { chest: '90–97', shoulder: '42–44', length: '71 cm' },
                    L:   { chest: '97–104', shoulder: '44–46', length: '73 cm' },
                    XL:  { chest: '104–112', shoulder: '46–48', length: '75 cm' },
                    XXL: { chest: '112–120', shoulder: '48–51', length: '77 cm' },
                    '3XL': { chest: '120–130', shoulder: '51–54', length: '79 cm' },
                  }[size];
                  return (
                    <tr key={size}
                      style={{
                        background: isRec ? 'var(--primary)' : isAlt ? 'var(--bg-elevated)' : 'transparent',
                        borderRadius: isRec ? '8px' : undefined,
                      }}>
                      <td className="py-2.5 px-2 font-black rounded-l-lg" style={{ color: isRec ? 'var(--primary-fg)' : 'var(--fg)' }}>
                        {size}
                        {isRec && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20">YOU</span>}
                      </td>
                      <td className="py-2.5 px-2" style={{ color: isRec ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>{specs?.chest}</td>
                      <td className="py-2.5 px-2" style={{ color: isRec ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>{specs?.shoulder}</td>
                      <td className="py-2.5 px-2 rounded-r-lg" style={{ color: isRec ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>{specs?.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      <button onClick={onReset}
        className="w-full py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-80"
        style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
        <RotateCcw size={15} /> Recalculate
      </button>
    </div>
  );
}

// ─── How to measure guide ─────────────────────────────────────────────────────
function HowToMeasure() {
  const tips = [
    { label: 'Chest', tip: 'Wrap the tape around the fullest part of your chest, keeping it level under your armpits.' },
    { label: 'Shoulder', tip: 'Measure across your back from the edge of one shoulder to the other (bone to bone).' },
    { label: 'Height', tip: 'Stand barefoot against a wall. Mark the top of your head and measure to the floor.' },
    { label: 'Weight', tip: 'Measured in the morning on an empty stomach for consistency.' },
  ];
  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <Info size={16} style={{ color: 'var(--accent)' }} /> How to Measure
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {tips.map(({ label, tip }) => (
          <div key={label}>
            <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--fg)' }}>{label}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
