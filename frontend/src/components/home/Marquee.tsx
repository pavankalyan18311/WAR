import type { MarqueeSettings } from '@/lib/homeContent';

/** Scrolling banner under the hero — text and colours come from Admin → Homepage. */
export default function Marquee({ settings }: { settings: MarqueeSettings }) {
  if (!settings.enabled || settings.items.length === 0) return null;
  // Repeat enough times that one copy is wider than the screen, then render two copies for a seamless loop.
  const copy = Array.from({ length: Math.max(2, Math.ceil(8 / settings.items.length)) }, () => settings.items).flat();

  return (
    <div className="overflow-hidden py-3.5" style={{ background: settings.background, color: settings.text_color }} aria-hidden>
      <div className="flex w-max animate-marquee">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {copy.map((word, i) => (
              <span key={i} className="font-display italic text-lg px-6 flex items-center gap-6 whitespace-nowrap">
                {word} <span className="not-italic text-xs" style={{ color: settings.accent_color }}>✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
