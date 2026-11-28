'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Check, CheckCircle2, ClipboardCheck, Copy, CreditCard, ExternalLink, Heart, Home, LogOut, MapPin, Package,
  PackageCheck, RotateCcw, Truck, User, XCircle, Clock, Lock,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

/* ─── Account area building blocks (UI kit: brand orange, soft cards) ─────── */

export type AccountTab = 'profile' | 'orders' | 'wishlist' | 'addresses';

const TABS: { key: AccountTab; label: string; href: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'Profile', href: '/account/profile', icon: User },
  { key: 'orders', label: 'Orders', href: '/account/orders', icon: Package },
  { key: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: Heart },
  { key: 'addresses', label: 'Addresses', href: '/account/profile#addresses', icon: MapPin },
];

const SIGN_IN_TEXT: Record<AccountTab, string> = {
  profile: 'your profile',
  orders: 'your orders',
  wishlist: 'your wishlist',
  addresses: 'your saved addresses',
};

// true in the browser, false while rendering on the server (the sign-in state lives in the browser).
const noop = () => () => {};
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

/** Shown instead of an (empty) account to someone who isn't signed in. */
function SignInPrompt({ active }: { active: AccountTab }) {
  return (
    <div className="w-full ui-page min-h-[70vh]">
      <div className="max-w-md mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="ui-card px-6 py-12 text-center">
          <span className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <Lock size={22} />
          </span>
          <h1 className="ui-heading text-2xl sm:text-3xl mb-2" style={{ color: 'var(--fg)' }}>Sign in to see {SIGN_IN_TEXT[active]}</h1>
          <p className="text-[15px] mb-8" style={{ color: 'var(--fg-muted)' }}>Track orders, keep a wishlist and check out faster with your WAR account.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/login" className="ui-btn">Sign in</Link>
            <Link href="/auth/register" className="ui-btn-ghost">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Page frame for every account page: friendly header, pill tab navigation, content. Asks visitors to sign in. */
export function AccountShell({ active, eyebrow = 'Your account', title, subtitle, onLogout, children }: {
  active: AccountTab;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const isClient = useIsClient();
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  if (isClient && !signedIn) return <SignInPrompt active={active} />;

  return (
    <div className="w-full ui-page min-h-[70vh]">
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-8 pt-8 sm:pt-12">
        <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--brand)' }}>{eyebrow}</p>
        <h1 className="ui-heading leading-tight" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--fg)' }}>{title}</h1>
        {subtitle && <p className="text-[15px] mt-2 max-w-xl" style={{ color: 'var(--fg-muted)' }}>{subtitle}</p>}

        <nav aria-label="Account" className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const isActive = t.key === active;
              const Icon = t.icon;
              return (
                <Link key={t.key} href={t.href} aria-current={isActive ? 'page' : undefined}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors"
                  style={isActive
                    ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'var(--brand-fg)' }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  <Icon size={15} /> {t.label}
                </Link>
              );
            })}
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors hover:text-[var(--bad)]"
              style={{ color: 'var(--fg-muted)' }}>
              <LogOut size={15} /> Sign out
            </button>
          )}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10">
        {children}
        {onLogout && (
          <button type="button" onClick={onLogout}
            className="sm:hidden mt-8 w-full ui-btn-ghost">
            <LogOut size={15} /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}

/** A section card inside the account area. */
export function AccountSection({ index, title, action, children, id }: {
  index?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28 ui-card p-5 sm:p-7" data-index={index}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="ui-heading text-xl sm:text-2xl leading-tight" style={{ color: 'var(--fg)' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ─── Order status ─────────────────────────────────────────────────────────── */

type Tone = 'brand' | 'ok' | 'info' | 'warn' | 'bad' | 'neutral';

const STATUS: Record<string, { label: string; tone: Tone; icon: React.ElementType }> = {
  pending: { label: 'Payment not completed', tone: 'neutral', icon: Clock },
  confirmed: { label: 'Confirmed', tone: 'info', icon: CheckCircle2 },
  processing: { label: 'Packed', tone: 'warn', icon: Package },
  shipped: { label: 'Shipped', tone: 'brand', icon: Truck },
  delivered: { label: 'Delivered', tone: 'ok', icon: PackageCheck },
  cancelled: { label: 'Cancelled', tone: 'bad', icon: XCircle },
  refunded: { label: 'Refunded', tone: 'bad', icon: RotateCcw },
};

export const statusLabel = (status: string) => STATUS[status]?.label ?? status;

/** Colourful rounded status chip with an icon. */
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'neutral' as Tone, icon: Clock };
  const Icon = s.icon;
  const cls = s.tone === 'neutral' ? 'ui-chip' : `ui-chip ui-chip-${s.tone}`;
  return (
    <span className={`${cls} whitespace-nowrap`}
      style={s.tone === 'neutral' ? { background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' } : undefined}>
      <Icon size={13} strokeWidth={2.4} /> {s.label}
    </span>
  );
}

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', desc: 'Order placed', icon: ClipboardCheck },
  { key: 'processing', label: 'Packed', desc: 'Quality checked & packed', icon: Package },
  { key: 'shipped', label: 'Shipped', desc: 'On the way with the courier', icon: Truck },
  { key: 'delivered', label: 'Delivered', desc: 'At your door', icon: Home },
];

const shortDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

/**
 * Confirmed → Packed → Shipped → Delivered. Horizontal stepper on larger screens, vertical on phones.
 * Completed steps are filled brand orange; the current step is highlighted.
 */
export function OrderTimeline({ status, placedAt, updatedAt }: { status: string; placedAt?: string | null; updatedAt?: string | null }) {
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--bad-soft)' }}>
        <XCircle size={20} style={{ color: 'var(--bad)' }} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'var(--fg)' }}>
          This order was <strong>{status}</strong>. Any refund goes back to your original payment method within 5–7 working days.
        </p>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--warn-soft)' }}>
        <Clock size={20} style={{ color: 'var(--warn)' }} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'var(--fg)' }}>
          We haven&apos;t received the payment for this order yet. If money was deducted, it is usually confirmed within a few minutes.
        </p>
      </div>
    );
  }

  const current = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const dateFor = (i: number) => (i === 0 ? shortDate(placedAt) : i === current ? shortDate(updatedAt) : '');

  return (
    <div aria-label="Order progress">
      {/* Desktop / tablet: horizontal */}
      <ol className="hidden sm:grid grid-cols-4 relative">
        {STEPS.map((s, i) => {
          const done = i <= current;
          const isCurrent = i === current;
          const Icon = done && !isCurrent ? Check : s.icon;
          return (
            <li key={s.key} className="relative flex flex-col items-center text-center px-2" aria-current={isCurrent ? 'step' : undefined}>
              {i > 0 && (
                <span aria-hidden className="absolute top-5 right-1/2 w-full h-1 -translate-y-1/2 rounded-full"
                  style={{ background: i <= current ? 'var(--brand)' : 'var(--border)' }} />
              )}
              <span className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: done ? 'var(--brand)' : 'var(--surface-2)',
                  color: done ? 'var(--brand-fg)' : 'var(--fg-subtle)',
                  border: done ? 'none' : '2px solid var(--border)',
                  boxShadow: isCurrent ? '0 0 0 6px var(--brand-soft)' : 'none',
                }}>
                <Icon size={18} strokeWidth={2.4} />
              </span>
              <span className="mt-3 text-sm font-bold" style={{ color: done ? 'var(--fg)' : 'var(--fg-subtle)' }}>{s.label}</span>
              <span className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{s.desc}</span>
              {dateFor(i) && <span className="text-xs mt-1 font-semibold" style={{ color: 'var(--brand)' }}>{dateFor(i)}</span>}
            </li>
          );
        })}
      </ol>

      {/* Phone: vertical */}
      <ol className="sm:hidden relative">
        {STEPS.map((s, i) => {
          const done = i <= current;
          const isCurrent = i === current;
          const Icon = done && !isCurrent ? Check : s.icon;
          const last = i === STEPS.length - 1;
          return (
            <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0" aria-current={isCurrent ? 'step' : undefined}>
              {!last && (
                <span aria-hidden className="absolute left-[17px] top-9 bottom-0 w-1 rounded-full"
                  style={{ background: i < current ? 'var(--brand)' : 'var(--border)' }} />
              )}
              <span className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? 'var(--brand)' : 'var(--surface-2)',
                  color: done ? 'var(--brand-fg)' : 'var(--fg-subtle)',
                  border: done ? 'none' : '2px solid var(--border)',
                  boxShadow: isCurrent ? '0 0 0 5px var(--brand-soft)' : 'none',
                }}>
                <Icon size={16} strokeWidth={2.4} />
              </span>
              <div className="pt-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: done ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                  {s.label}{dateFor(i) && <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--brand)' }}>{dateFor(i)}</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{s.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Courier name + tracking number (copyable) + link to the live courier tracking page. */
export function TrackingInfo({ courier, awb }: { courier?: string | null; awb?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!awb && !courier) return null;
  const isTest = !!awb && /^SRK-DEV-/i.test(awb);

  const copy = async () => {
    if (!awb) return;
    try {
      await navigator.clipboard.writeText(awb);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="ui-card-soft p-4 flex flex-wrap items-center gap-4">
      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
        <Truck size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{courier || 'Courier'}</p>
        {awb ? (
          <p className="text-base font-bold tracking-wide break-all" style={{ color: 'var(--fg)' }}>
            {awb}
            {isTest && <span className="ml-2 text-[11px] font-semibold" style={{ color: 'var(--fg-subtle)' }}>(test)</span>}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Tracking number will appear once the parcel is handed to the courier.</p>
        )}
      </div>
      {awb && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="ui-btn-ghost !py-2 !px-3 text-sm" aria-label="Copy tracking number">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
          {!isTest && (
            <a href={`https://shiprocket.co/tracking/${encodeURIComponent(awb)}`} target="_blank" rel="noopener noreferrer"
              className="ui-btn !py-2 !px-3 text-sm">
              Live tracking <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** "Razorpay · UPI" / "Cash on delivery" from an order's payment fields. */
export function paymentLabel(order: any): string {
  let notes: any = {};
  if (typeof order?.notes === 'string') {
    try { notes = JSON.parse(order.notes); } catch { /* not JSON */ }
  } else if (order?.notes && typeof order.notes === 'object') {
    notes = order.notes;
  }
  const gateway = notes.gateway || order?.shipping_address?.gateway;
  const detail = notes.payment_method_detail || order?.shipping_address?.payment_method_detail;
  const wallet = notes.wallet || order?.shipping_address?.wallet;
  if (gateway === 'Razorpay') return ['Razorpay', detail?.toUpperCase(), wallet?.toUpperCase()].filter(Boolean).join(' · ');
  const method = String(order?.payment_method || '').toLowerCase();
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'points') return 'Reward points';
  if (method === 'razorpay') return 'Paid online';
  if (['upi', 'card', 'net_banking', 'wallet'].includes(method)) {
    return `Paid online · ${method === 'net_banking' ? 'Net banking' : method === 'upi' ? 'UPI' : method[0].toUpperCase() + method.slice(1)}`;
  }
  return method ? method.toUpperCase() : 'Cash on delivery';
}

/** Payment status as a small coloured chip. */
export function PaymentChip({ order }: { order: any }) {
  const status = String(order?.payment_status || '');
  const cod = String(order?.payment_method || '').toLowerCase() === 'cod';
  if (status === 'paid') return <span className="ui-chip ui-chip-ok"><CreditCard size={12} /> Paid</span>;
  if (status === 'refunded') return <span className="ui-chip ui-chip-info"><RotateCcw size={12} /> Refunded</span>;
  if (status === 'failed') return <span className="ui-chip ui-chip-bad">Payment failed</span>;
  if (cod) return <span className="ui-chip ui-chip-warn">Pay on delivery</span>;
  return <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>Payment pending</span>;
}

/** Small label + value pair. */
export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</p>
      <div className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{children}</div>
    </div>
  );
}
