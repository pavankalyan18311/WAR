import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price?: number | null): string {
  if (price === undefined || price === null) return '₹0';
  const num = Number(price);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function calculateDiscount(original?: number | null, discounted?: number | null): number {
  const orig = Number(original || 0);
  const disc = Number(discounted || 0);
  if (!orig || orig <= 0 || !disc || disc >= orig) return 0;
  return Math.round(((orig - disc) / orig) * 100);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
