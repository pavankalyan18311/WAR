import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tees hanging on the home page rack hero.
 * Managed in Admin → Homepage → Rack tees (table `home_rack_tees`).
 * RACK_TEES below is only the fallback used before that migration is run.
 */
export interface RackTee {
  id: string;
  name: string;
  price: number;
  front: string;
  /** Back photo; without one the tee doesn't flip. */
  back?: string;
  href: string;
  featured?: boolean;
}

/** A row of `home_rack_tees`. */
export interface RackTeeRow {
  id: string;
  name: string;
  price: number | string;
  front_url: string;
  back_url: string | null;
  link_url: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_featured: boolean;
}

export interface RackTeeInput {
  name: string;
  price: number;
  front_url: string;
  back_url: string | null;
  link_url: string | null;
}

export class RackHeroError extends Error {}

const DEFAULT_LINK = '/products';
const MAX_NAME = 40;

export const RACK_TEES: RackTee[] = [
  { id: 'ashen-halo', name: 'Ashen Halo Tee', price: 1499, front: '/images/rack/ashen-halo-front.jpg', back: '/images/rack/ashen-halo-back.jpg', href: '/products' },
  { id: 'grid-runner', name: 'Grid Runner Tee', price: 1599, front: '/images/rack/grid-runner-front.jpg', back: '/images/rack/grid-runner-back.jpg', href: '/products' },
  { id: 'zoro-green', name: 'Three Sword Jersey', price: 1799, front: '/images/rack/zoro-green-front.jpg', back: '/images/rack/zoro-green-back.jpg', href: '/products', featured: true },
  { id: 'ember-patch', name: 'Ember Patch Tee', price: 1499, front: '/images/rack/ember-patch-front.jpg', back: '/images/rack/ember-patch-back.jpg', href: '/products' },
  { id: 'thunder-stripe', name: 'Thunder Stripe Tee', price: 1699, front: '/images/rack/thunder-stripe-front.jpg', back: '/images/rack/thunder-stripe-back.jpg', href: '/products' },
];

export function getInitialIndex(tees: RackTee[]): number {
  const i = tees.findIndex((t) => t.featured);
  return i === -1 ? 0 : i;
}

export function nextIndex(current: number, count: number): number {
  return count <= 1 ? 0 : (current + 1) % count;
}

export function prevIndex(current: number, count: number): number {
  return count <= 1 ? 0 : (current - 1 + count) % count;
}

const fail = (msg: string): never => { throw new RackHeroError(msg); };
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Uploaded photos (https) or the built-in ones shipped in /public/images/. */
const isPhotoUrl = (v: string) => /^https:\/\/\S+$/.test(v) || /^\/images\/\S+$/.test(v);

export function parseRackName(v: unknown): string {
  const name = text(v);
  if (!name) fail('Give the tee a name.');
  if (name.length > MAX_NAME) fail(`Keep the name under ${MAX_NAME} characters.`);
  return name;
}

export function parseRackPrice(v: unknown): number {
  const price = typeof v === 'number' ? v : Number(text(v));
  if (!Number.isFinite(price) || price <= 0 || price > 100000) fail('Enter a price in rupees, like 1499.');
  return Math.round(price * 100) / 100;
}

export function parseRackPhoto(v: unknown, which: 'front' | 'back', required: boolean): string | null {
  const url = text(v);
  if (!url) return required ? fail(`Upload a ${which} photo.`) : null;
  return isPhotoUrl(url) ? url : fail(`The ${which} photo must be an uploaded image.`);
}

/** A page on this site ("/products/…"); empty → null (links to all products). */
export function parseRackLink(v: unknown): string | null {
  const link = text(v);
  if (!link) return null;
  return /^\/(?!\/)\S*$/.test(link) ? link : fail('The link must be a page on this site, like /products/three-sword-jersey.');
}

export function parseRackTeeInput(input: unknown): RackTeeInput {
  const body = (input ?? {}) as Record<string, unknown>;
  return {
    name: parseRackName(body.name),
    price: parseRackPrice(body.price),
    front_url: parseRackPhoto(body.front_url, 'front', true) as string,
    back_url: parseRackPhoto(body.back_url, 'back', false),
    link_url: parseRackLink(body.link_url),
  };
}

export function rowToRackTee(row: RackTeeRow): RackTee {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    front: row.front_url,
    back: row.back_url ?? undefined,
    href: row.link_url ?? DEFAULT_LINK,
    featured: !!row.is_featured,
  };
}

/** Active rack tees in rail order (server). Before the migration is run, the built-in tees. */
export async function loadRackTees(supabase: SupabaseClient): Promise<RackTee[]> {
  const { data, error } = await supabase
    .from('home_rack_tees')
    .select('id, name, price, front_url, back_url, link_url, is_featured')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
    .limit(12);
  if (error || !data) return RACK_TEES;
  return (data as RackTeeRow[]).map(rowToRackTee);
}
