import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ShieldCheck, Truck, Sparkles } from 'lucide-react';
import WarLogo from '@/components/brand/WarLogo';

const PERKS = [
  { icon: Truck, text: 'Track every order in one place' },
  { icon: Sparkles, text: 'Earn reward points on delivery' },
  { icon: ShieldCheck, text: 'Secure checkout & easy returns' },
];

/**
 * Split layout for the sign-in pages: bright campaign panel on the left (desktop only),
 * the form in a rounded card on the right. Single column on phones.
 */
export default function AuthShell({ eyebrow, title, subtitle, children, footer, image = '/images/Hero_banner.png' }: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  image?: string;
}) {
  return (
    <div className="ui-page w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch min-h-[calc(100vh-8rem)]">
        {/* Brand panel */}
        <div className="relative hidden lg:flex overflow-hidden rounded-3xl" style={{ background: '#161412' }}>
          <Image src={image} alt="" fill priority className="object-cover" sizes="50vw" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, rgba(243,110,33,0.35) 0%, rgba(22,20,18,0.15) 40%, rgba(22,20,18,0.9) 100%)' }} />
          <div className="relative mt-auto p-10 text-white">
            <span className="ui-chip mb-5" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}>WAR — Est. 2026</span>
            <p className="ui-heading leading-[0.98]" style={{ fontSize: 'clamp(2.6rem, 4vw, 3.8rem)' }}>
              Without Any <span style={{ color: '#FF8A45' }}>Regrets.</span>
            </p>
            <ul className="mt-7 space-y-3">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)' }}>
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form card */}
        <div className="ui-card flex items-center justify-center px-5 sm:px-10 py-10 sm:py-12 shadow-[0_20px_50px_-30px_rgba(22,20,18,0.35)]">
          <div className="w-full max-w-[420px]">
            <Link href="/" aria-label="WAR" className="inline-flex mb-8" style={{ color: 'var(--fg)' }}>
              <WarLogo decorative className="h-7 w-auto" />
            </Link>
            <span className="ui-chip ui-chip-brand mb-3">{eyebrow}</span>
            <h1 className="ui-heading leading-[1.05]" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.5rem)', color: 'var(--fg)' }}>{title}</h1>
            {subtitle && <p className="text-[15px] mt-3 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && (
              <div className="mt-8 pt-6 border-t text-sm" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>{footer}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Field label above an input. */
export function FieldLabel({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
        {children}
      </label>
      {aside}
    </div>
  );
}

/** Inline error/notice box used by the auth forms. */
export function FormNotice({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const isError = tone === 'error';
  return (
    <div role={isError ? 'alert' : 'status'} className="mb-6 px-4 py-3 text-sm font-medium rounded-xl"
      style={{ background: isError ? 'var(--bad-soft)' : 'var(--ok-soft)', color: isError ? 'var(--bad)' : 'var(--ok)' }}>
      {children}
    </div>
  );
}
