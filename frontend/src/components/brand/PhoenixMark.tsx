import Image from 'next/image';
import { clsx } from 'clsx';

/**
 * WAR phoenix emblem (orange W with black wings, transparent PNG).
 * In dark mode the black wings are inverted to light so they stay visible;
 * invert + hue-rotate keeps the orange close to brand orange.
 */
export default function PhoenixMark({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <Image
      src="/images/brand/phoenix.png"
      alt={decorative ? '' : 'WAR phoenix'}
      width={493}
      height={395}
      className={clsx('phoenix-mark h-auto', className)}
    />
  );
}
