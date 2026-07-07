'use client';

import { useMemo, useState } from 'react';
import { Save, RotateCcw, Image as ImageIcon, Video, Timer, BadgeCheck } from 'lucide-react';
import { useAuthPopupStore } from '@/store/authPopupStore';

const DELAY_OPTIONS = [5000, 10000, 15000, 30000];

export default function AdminSettingsPage() {
  const { config, updateConfig, resetDefaults } = useAuthPopupStore();
  const [customDelay, setCustomDelay] = useState(String(config.delayMs));
  const [saved, setSaved] = useState(false);

  const delayLabel = useMemo(() => {
    if (DELAY_OPTIONS.includes(config.delayMs)) return `${config.delayMs / 1000}s`;
    return `${Math.round(config.delayMs / 1000)}s (Custom)`;
  }, [config.delayMs]);

  const persistSavedToast = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Authentication Popup</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Configure the luxury authentication modal experience for guest users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetDefaults();
              setCustomDelay('10000');
              persistSavedToast();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="button"
            onClick={persistSavedToast}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {saved && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.22)' }}>
          <BadgeCheck size={14} /> Settings saved
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold">Popup Behavior</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Enable authentication popup</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
              />
            </label>

            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Popup delay: {delayLabel}</p>
              <div className="flex flex-wrap gap-2">
                {DELAY_OPTIONS.map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => {
                      updateConfig({ delayMs: ms });
                      setCustomDelay(String(ms));
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: config.delayMs === ms ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: config.delayMs === ms ? 'var(--primary-fg)' : 'var(--fg-muted)',
                    }}
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1000}
                  value={customDelay}
                  onChange={(e) => setCustomDelay(e.target.value)}
                  className="w-36 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = Number(customDelay);
                    if (Number.isFinite(parsed) && parsed >= 1000) {
                      updateConfig({ delayMs: parsed });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg)' }}
                >
                  <Timer size={12} /> Apply Custom
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Session behavior</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateConfig({ sessionBehavior: 'once-per-session' })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: config.sessionBehavior === 'once-per-session' ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: config.sessionBehavior === 'once-per-session' ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  Once Per Session
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ sessionBehavior: 'always' })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: config.sessionBehavior === 'always' ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: config.sessionBehavior === 'always' ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  Always Show
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold">Popup Content</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Media Type</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateConfig({ mediaType: 'image' })}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: config.mediaType === 'image' ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: config.mediaType === 'image' ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  <ImageIcon size={13} /> Image
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ mediaType: 'video' })}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: config.mediaType === 'video' ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: config.mediaType === 'video' ? 'var(--primary-fg)' : 'var(--fg-muted)',
                  }}
                >
                  <Video size={13} /> Video
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>Media URL (image/video)</label>
              <input
                type="url"
                value={config.mediaUrl}
                onChange={(e) => updateConfig({ mediaUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>Headline</label>
              <input
                type="text"
                value={config.headline}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>Description</label>
              <textarea
                value={config.description}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>CTA Text</label>
              <input
                type="text"
                value={config.ctaText}
                onChange={(e) => updateConfig({ ctaText: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
