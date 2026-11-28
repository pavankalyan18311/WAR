import { NextResponse } from 'next/server';

/**
 * Small fixed-window rate limiter for public forms (password reset, contact, newsletter, coupons…).
 * Counts live in this server's memory: enough to stop a bot hammering one server. With several
 * servers each keeps its own count, so the real limit is a multiple of `limit` — still a strong brake.
 */
export type RateRule = { limit: number; windowMs: number };

/** Ready-made rules for the public endpoints. */
export const RATE = {
  /** Emails sent on someone's behalf (OTP, reset): very tight. */
  email: { limit: 5, windowMs: 15 * 60_000 },
  /** OTP guesses. */
  verify: { limit: 10, windowMs: 15 * 60_000 },
  /** Forms that write to the database (contact, newsletter, stock alerts, reviews). */
  form: { limit: 10, windowMs: 10 * 60_000 },
  /** Cheap look-ups (coupon check, pincode, serviceability). */
  lookup: { limit: 60, windowMs: 60_000 },
  /** Header search (fires as you type, debounced). */
  search: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateRule>;

const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

/** The visitor's IP: first entry of x-forwarded-for (set by the hosting proxy), else x-real-ip. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Returns null when the request may go ahead, or a 429 response to send back.
 * `key` defaults to the visitor's IP; pass something else (e.g. an email) to limit per target too.
 */
export function rateLimit(request: Request, bucket: string, rule: RateRule, key: string = clientIp(request)): NextResponse | null {
  const now = Date.now();
  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    if (hits.size > MAX_KEYS) hits.clear();
  }

  const id = `${bucket}:${key.toLowerCase()}`;
  const entry = hits.get(id);
  if (!entry || entry.resetAt <= now) {
    hits.set(id, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count <= rule.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Too many attempts. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Test helper: forget all counts. */
export function resetRateLimits() {
  hits.clear();
}
