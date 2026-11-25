import Image from 'next/image';

/**
 * Fills its (position: relative) parent with the product photo, or a neutral
 * branded block when no photo has been uploaded — never a stock photo.
 */
export default function ProductImage({
  src,
  alt,
  className = 'object-cover',
  sizes,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  if (!src) {
    return (
      <div
        aria-label={`${alt} — no photo yet`}
        className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-[0.3em]"
        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}
      >
        WAR
      </div>
    );
  }
  return <Image src={src} alt={alt} fill className={className} sizes={sizes} />;
}
